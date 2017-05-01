var worldatlastopojsonfile = 'https://unpkg.com/world-atlas@1.1.4/world/110m.json';
var meteordatafile = 'https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/meteorite-strike-data.json';

var svg = d3.select('.svg');
var underlying = svg.append('g');
var width = window.innerWidth;
var height = window.innerHeight;

//adding mouse zoom and pan to entire svg element
/*
svg (all zoom based calls are listened here using .call function in this place)
>>underlay (everything is drawn here and is acted upon when zoom is done on above svg)
*basically don't draw where zoom is being done; draw in a group inside it and apply all transformations there
*/

//create zoom object
var zoom = d3.zoom().scaleExtent([1, 7]).on("zoom", draw);
//call zoom on svg object where zoom is done
svg.call(zoom);
//define draw function which gets called everytime a zoom is done
function draw() {
  underlying.attr("transform", d3.event.transform);
  //change circle stroke for cleaner zoomed in view
  if (d3.event.transform.k > 3) {
    d3.selectAll('.meteor').attr('stroke-width', 0.25);
  } else if (d3.event.transform.k > 2) {
    d3.selectAll('.meteor').attr('stroke-width', 0.5);
  } else {
    d3.selectAll('.meteor').attr('stroke-width', 1);
  }
}

//create projection which converts spherical polygonal geometry to planar polygonal geometry
var projection = d3.geoMercator()
  .translate([width / 2, height / 2])
  .scale(200);

//create path and assign it to follow above projection rules (Mercator in this case)
var path = d3.geoPath()
  .projection(projection);

//if more than one external files need loading, use queue/defer/await to handle async tasks
//create a queue
var q = d3.queue();
//defer tasks to queue
q.defer(d3.json, worldatlastopojsonfile);
q.defer(d3.json, meteordatafile);
//ready will execute once all tasks in queue are completed
q.await(ready);

function ready(error, world, meteor) {

  /*
  topojson.feature converts RAW geo data (world) into USABLE geo data
  send it (a) root of your data (world) and (b) specific data you're looking for
  */

  var countrieFeatureList = topojson.feature(world, world.objects.countries).features;

  //add a path for each country

  underlying.selectAll('.country')
    .data(countrieFeatureList)
    .enter().append('path')
    .attr('class', 'country')
    .attr('d', path)
    .attr('fill', '#ccc')
    .on('mouseover', function () {
      d3.select(this).classed('active_country', true);
    })
    .on('mouseout', function () {
      d3.select(this).classed('active_country', false);
    });

  //add meteor circles to existing map
  //data from csv is already a featurelist (array of feature objects)

  var meteorFeatureList = meteor.features.filter(dataobject => (dataobject.geometry && +dataobject.properties.mass));
  meteorFeatureList.sort((a, b) => b.properties.mass - a.properties.mass);

  //a scale to convert radius of circle based on meteor mass

  var massScale = d3.scaleSqrt()
    .range([0.5, width / 20])
    .domain(d3.extent(meteorFeatureList.map(d => +d.properties.mass)));

  //a scale to convert meteor number (index) to hue (0 to 360)

  var hueScale = d3.scaleLinear()
    .range([0, 360])
    .domain([0, meteorFeatureList.length]);

  //a scale to convert meteor mass to opacity (so that large circles are lighter)

  var opacityScale = d3.scaleLinear()
    .range([0.6, 0.1])
    .domain(d3.extent(meteorFeatureList.map(d => +d.properties.mass)));

  underlying.selectAll('.meteor')
    .data(meteorFeatureList)
    .enter().append('circle')
    .attr('class', 'meteor')
    .attr('cx', d => projection(d.geometry.coordinates)[0])
    .attr('cy', d => projection(d.geometry.coordinates)[1])
    .attr('r', d => massScale(+d.properties.mass))
    .attr('stroke', '#222')
    .attr('stroke-width', 1)
    .attr('fill', (d, i) => 'hsla(' + Math.floor(hueScale(i)) + ', 80%, 60%, ' + opacityScale(d.properties.mass) + ')')
    .on('mouseover', () => tool.style('display', null))
    .on('mouseout', () => tool.style('display', 'none'))
    .on('mousemove', d => {
      tool
        .style('display', 'inline-block')
        .style('left', d3.event.pageX + 20 + 'px')
        .style('top', d3.event.pageY + 20 + 'px')
        .html('<ul>' +
          '<li>' + '<span class="title">' + 'Fall: ' + '</span>' + d.properties.fall + '</li>' +
          '<li>' + '<span class="title">' + 'Mass: ' + '</span>' + d.properties.mass + '</li>' +
          '<li>' + '<span class="title">' + 'Name: ' + '</span>' + d.properties.name + '</li>' +
          '<li>' + '<span class="title">' + 'Nametype: ' + '</span>' + d.properties.nametype + '</li>' +
          '<li>' + '<span class="title">' + 'Recclass: ' + '</span>' + d.properties.recclass + '</li>' +
          '<li>' + '<span class="title">' + 'Reclat: ' + '</span>' + d.properties.reclat + '</li>' +
          '<li>' + '<span class="title">' + 'Year: ' + '</span>' + d.properties.year + '</li>' +
          '</ul>')
    });

  //adding tooltip

  var tool = d3.select('.graph')
    .append('div')
    .attr('class', 'tool');

}