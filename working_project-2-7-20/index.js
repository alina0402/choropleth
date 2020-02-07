const US_EDU_DATA = 'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json';
const US_COUNTY_DATA = 'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json';

const COLORS = d3.schemeGreens[9]; 

const BORDER_COLOR = 0;
const LEGEND_SQUARE_SIDE = 20;
const LEGEND_PADDING = 5;
const PADDING = 60; 

function makeLegend(svg, colors, values, height, formatIt, showFirstLast) { // the function makes horizontal legend
        // svg - the svg element to have the legend
        // colors - the array of colors (array(N))
        // values - the array of values to write upon rects (array(N+1))
        // height - the total height of svg
        // formatIt - format for text labels (string like ".2f" or '.0%')
        // showFirstLast - boolean flag indicates whether to show the least and the last meanings of the legend
        const cellHeight = 10;
        const cellWidth = 40;
        const borderColor = "black";

        let g = svg.append("g")  // make legend group
          .attr("id", "legend")
          .attr("transform", "translate(" + PADDING + "," + (height - cellHeight - 10) + ")");
        
        g.selectAll("#legend rect")  //  make colored rectangles using 'colors' variable
          .data(colors)
          .enter()
          .append("rect")
          .style("fill", (d) => d)
          .style("stroke", borderColor)
            .attr("width", cellWidth)
            .attr("height", cellHeight)
            .attr("x", (d, i) => i*cellWidth )
            .attr("y", 0);
        g.selectAll("#legend text")  // make text labels under the rectangles using 'values' variable
            .data(values)
            .enter()
            .append("text")
            .text((d, i) => 
                        (((i=== 0) || (i === values.length-1)) && showFirstLast) ||
                        (i != 0 && i != values.length-1) ? d3.format(formatIt)(d) : '')
            .attr("x", (d, i) =>i*cellWidth - 5)
            .attr("y", cellHeight+10)
            .attr("z-index", "-1")
            .attr("font-size", "10px");         
}

    const visWidth = document.getElementById('container').clientWidth - PADDING;
    const titlesHeight = document.getElementById("title").offsetHeight + document.getElementById("title2").offsetHeight;
    const visHeight = document.getElementById('container').offsetHeight
                        - titlesHeight
                        - PADDING*2;

    const svg = d3.select("#visData")
                  .append("svg")
                  .attr('width', visWidth)
                  .attr('height', visHeight);

    // MAKE TOOLTIP:
    const tooltip = d3.selectAll('#visData')
                      .append('div')
                      .attr('id', 'tooltip')
                      .style('opacity', 0);

    
    d3.queue()    // wait until data from the following files is loaded...
      .defer(d3.json, US_EDU_DATA)
      .defer(d3.json, US_COUNTY_DATA)
      .await(drawMap)  //... and call the drawMap()

   function drawMap(error, usEdu, usCounties){   
           // error - true if something went wrong during data loading
           // usEdu - results of 1st file loading 
           // usCounties - results of 2d file loading 

        if(error)
            throw(error);

        // find minimum and maximum numbers of people with Bachelor degree ( % per county)
        const numberOfBachelorsByCounty = usEdu.map(item => item.bachelorsOrHigher);
        const min = d3.min(numberOfBachelorsByCounty);
        const max = d3.max(numberOfBachelorsByCounty);

        // make color steps:
        const valueSteps = d3.range(min, max, (max-min)/8);  // for 9 colors we have 8 meanings: --|--|--
        const values =  [0, ...valueSteps.map(item => item/100), max/100];  // we're going to show values as percents, 
                                                                           // that's why we need to divide item to 100.

        makeLegend(svg, COLORS, values, visHeight, '.1%', false);  // draw the legend at the bottom of 'svg' using 'COLORS' array to fill rects,
                                                                   // 'values' array to make text labels, 
                                                                   // '.1%' to format values as percents with 1 decimal,
                                                                   // false for not showing the first and the last values

        const color = d3.scaleThreshold()  // function to find right color for the value
                        .domain(valueSteps)
                        .range(COLORS);

        const topoData = topojson.feature(usCounties, usCounties.objects.counties).features;

        svg.append('g')
           .selectAll('path')
           .data(topoData)
           .enter()
           .append('path')
           .attr('data-fips', (d) => d.id)
           .attr('data-education', (d) => {
                   res = usEdu.filter((item) => item.fips == d.id)
                   return res[0] ? res[0].bachelorsOrHigher : 0;
           })
           .attr('fill', (d, i) => {
                let res = usEdu.filter(obj => obj.fips === d.id);
                return res[0] ? color(res[0].bachelorsOrHigher) : 0
            })
           .attr('d', d3.geoPath())  // data generation function
           .on("mouseover", function(d){
             const res = usEdu.filter(obj => obj.fips === d.id);
             const tooltipText = !res[0] ? "no info" : 
                                res[0].area_name + ', ' + res[0].state + "<br>" + 
                                'Bachelors or higher: ' + d3.format('.1%')(res[0].bachelorsOrHigher/100);
              tooltip.style('opacity', 1)
                                .html(tooltipText)
                                .style("left", (d3.event.pageX-90)+'px')
                                .style("top", (d3.event.pageY-60)+'px')
                                .attr('data-education', () => res[0] ? res[0].bachelorsOrHigher : 0)
           })
           .on('mouseout', function(d){
             tooltip.style('opacity', 0);
           })
   }