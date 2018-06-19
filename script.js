var svg = d3.select("svg"),
    margin = { top: 20, right: 20, bottom: 110, left: 40 },
    margin2 = { top: 430, right: 20, bottom: 30, left: 40 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    height2 = +svg.attr("height") - margin2.top - margin2.bottom;

var x = d3.scaleTime().range([0, width]),
    x2 = d3.scaleTime().range([0, width]),
    y = d3.scaleBand()
    .range([height, 0]),
    y2 = d3.scaleBand()
    .range([height2, 0]);

var xAxis = d3.axisBottom(x),
    xAxis2 = d3.axisBottom(x2),
    yAxis = d3.axisLeft(y);

var brush = d3.brushX()
    .extent([
        [0, 0],
        [width, height2]
    ])
    .on("brush end", brushed);

var zoom = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([
        [0, 0],
        [width, height]
    ])
    .extent([
        [0, 0],
        [width, height]
    ])
    .on("zoom", zoomed);

// var area = d3.area()
//     .curve(d3.curveMonotoneX)
//     .x(function(d) { return x(d.start_year); })
//     .y0(height)
//     .y1(function(d) { return y(d.titolo); });

// var area2 = d3.area()
//     .curve(d3.curveMonotoneX)
//     .x(function(d) { return x2(d.start_year); })
//     .y0(height2)
//     .y1(function(d) { return y2(d.titolo); });

svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

var focus = svg.append("g")
    .attr("class", "focus")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var context = svg.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

// d3.tsv("data.tsv", type, function(error, data) {
//     if (error) throw error;


// });

function brushed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
    var s = d3.event.selection || x2.range();
    x.domain(s.map(x2.invert, x2));
    // focus.select(".area").attr("d", area);
    focus.select(".axis--x").call(xAxis);
    svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
        .scale(width / (s[1] - s[0]))
        .translate(-s[0], 0));
}

function zoomed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
    var t = d3.event.transform;
    x.domain(t.rescaleX(x2).domain());
    // focus.select(".area").attr("d", area);
    focus.select(".axis--x").call(xAxis);
    context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
}

function update(data) {
    let yDomain = [];
    let titoli = data.info.elements.map(function(d) {
        return d.id;
    })

    titoli.forEach(function(d) {
        if (yDomain.indexOf(d) < 0) {
            yDomain.push(d);
        }
    })

    x.domain(d3.extent(data.stesure.elements, function(d) { return d.start_year; }));
    console.log(x.domain())
    y.domain(yDomain);

    x2.domain(x.domain());
    y2.domain(y.domain());

    // focus.append("path")
    //     .datum(data)
    //     .attr("class", "area")
    //     .attr("d", area);

    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    // context.append("path")
    //     .datum(data)
    //     .attr("class", "area")
    //     .attr("d", area2);

    context.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    context.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());

    svg.append("rect")
        .attr("class", "zoom")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(zoom);
}

var parseDate = d3.timeParse("%Y-%m-%d");

function init() {
    Tabletop.init({
        key: 'https://docs.google.com/spreadsheets/d/1scAZdBWZjjboRtQlpvsWUDP52wydzxo1bLKIV07j-_Q/edit?usp=sharing',
        callback: function(data, tabletop) {

            data.stesure.elements.forEach(function(d) {

                d.precision_start = 'none';
                if (d.start_year) {
                    d.precision_start = 'year';
                    if (d.start_month) {
                        d.precision_start = 'month';
                        if (d.start_day) {
                            d.precision_start = 'day';
                            var dateString = d.start_year + '-' + d.start_month + '-' + d.start_day;
                            d.start = parseDate(dateString);
                        } else {
                            var dateString = d.start_year + '-' + d.start_month + '-01';
                            d.start = parseDate(dateString);
                        }
                    } else {
                        var dateString = d.start_year + '-01-01';
                        d.start = parseDate(dateString);
                    }
                } else {
                    d.start = undefined;
                }
                console.log(d.start);
            })

            console.log(data);
            update(data);
        },
        simpleSheet: false
    })
}
window.addEventListener('DOMContentLoaded', init)

function type(d) {
    d.start_year = parseDate(d.start_year);
    // d.titolo = d.titolo;
    return d;
}