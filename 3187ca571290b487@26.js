function _1(md){return(
md`d3 = require("d3@7")`
)}

function _topojson(require){return(
require("topojson-client")
)}

function _iso(){return(
fetch("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json").then(r => r.json())
)}

async function _4(d3,topojson)
{
  const raw = await fetch("https://ourworldindata.org/grapher/life-expectancy.csv")
    .then(r => r.text())
    .then(text => d3.csvParse(text))

  const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(r => r.json())

  const iso = await fetch("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json")
    .then(r => r.json())

  const valueCol = "Life expectancy"
  const years = [...new Set(raw.map(d => +d.Year))].sort()
  const dataMap = new Map(raw.map(d => [`${d.Code}_${d.Year}`, +d[valueCol]]))

  const width = 900, height = 500
  let currentYear = years[0]
  let playing = false
  let timer = null

  const colorScale = d3.scaleSequential()
    .domain([30, 85])
    .interpolator(d3.interpolateRdYlGn)

  const projection = d3.geoNaturalEarth1()
    .scale(153)
    .translate([width / 2, height / 2])

  const path = d3.geoPath().projection(projection)
  const countries = topojson.feature(world, world.objects.countries).features

  const getAlpha3 = (d) =>
    iso.find(c => c['country-code'] === String(+d.id).padStart(3, '0'))?.['alpha-3']

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#f0f4f8")

  const paths = svg.selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)

  const yearLabel = svg.append("text")
    .attr("x", width - 20)
    .attr("y", height - 20)
    .attr("text-anchor", "end")
    .attr("font-size", 48)
    .attr("font-weight", "bold")
    .attr("fill", "rgba(0,0,0,0.15)")

  // legend
  const legendWidth = 200, legendHeight = 10
  const legendSvg = svg.append("g")
    .attr("transform", `translate(20, ${height - 40})`)

  const defs = svg.append("defs")
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient")

  linearGradient.selectAll("stop")
    .data(d3.range(0, 1.1, 0.1))
    .join("stop")
    .attr("offset", d => d)
    .attr("stop-color", d => colorScale(30 + d * 55))

  legendSvg.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)")

  legendSvg.append("text")
    .attr("x", 0)
    .attr("y", legendHeight + 15)
    .attr("font-size", 11)
    .text("30 years")

  legendSvg.append("text")
    .attr("x", legendWidth)
    .attr("y", legendHeight + 15)
    .attr("text-anchor", "end")
    .attr("font-size", 11)
    .text("85 years")

  legendSvg.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("font-weight", "bold")
    .text("Life Expectancy")

  const container = d3.select(document.createElement("div"))
    .style("font-family", "sans-serif")

  const controls = container.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "12px")
    .style("padding", "10px 20px")
    .style("background", "#fff")
    .style("border-bottom", "1px solid #eee")

  const btn = controls.append("button")
    .text("▶ Play")
    .style("padding", "6px 16px")
    .style("font-size", "14px")
    .style("cursor", "pointer")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")

  const slider = controls.append("input")
    .attr("type", "range")
    .attr("min", years[0])
    .attr("max", years[years.length - 1])
    .attr("value", years[0])
    .attr("step", 1)
    .style("width", "400px")

  const yearDisplay = controls.append("span")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("min-width", "50px")
    .text(years[0])

  function update(year) {
    currentYear = year
    yearLabel.text(year)
    paths.transition().duration(200)
      .attr("fill", d => {
        const alpha3 = getAlpha3(d)
        const val = dataMap.get(`${alpha3}_${year}`)
        return val ? colorScale(val) : "#ccc"
      })
    slider.property("value", year)
    yearDisplay.text(year)
  }

  btn.on("click", () => {
    playing = !playing
    btn.text(playing ? "⏸ Pause" : "▶ Play")
    if (playing) {
      timer = d3.interval(() => {
        let idx = years.indexOf(currentYear)
        if (idx >= years.length - 1) {
          playing = false
          btn.text("▶ Play")
          timer.stop()
          return
        }
        update(years[idx + 1])
      }, 150)
    } else {
      if (timer) timer.stop()
    }
  })

  slider.on("input", function() {
    if (timer) timer.stop()
    playing = false
    btn.text("▶ Play")
    update(+this.value)
  })

  const tooltip = d3.select(document.createElement("div"))
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.75)")
    .style("color", "#fff")
    .style("padding", "8px 12px")
    .style("border-radius", "6px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("display", "none")

  paths
    .on("mousemove", (event, d) => {
      const alpha3 = getAlpha3(d)
      const val = dataMap.get(`${alpha3}_${currentYear}`)
      const name = iso.find(c => c['country-code'] === String(+d.id).padStart(3, '0'))?.name
      tooltip
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 30) + "px")
        .html(val
          ? `<b>${name}</b><br>Life Expectancy: <b>${val.toFixed(1)}</b> years`
          : `<b>${name}</b><br>No data`)
    })
    .on("mouseleave", () => tooltip.style("display", "none"))

  container.node().appendChild(svg.node())
  document.body.appendChild(tooltip.node())

  update(currentYear)

  return container.node()
}


async function _5(d3,topojson)
{
  const raw = await fetch("https://ourworldindata.org/grapher/life-expectancy.csv")
    .then(r => r.text())
    .then(text => d3.csvParse(text))

  const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(r => r.json())

  const iso = await fetch("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json")
    .then(r => r.json())

  const countries = topojson.feature(world, world.objects.countries).features


  console.log("GeoJSON id:", countries[0].id, typeof countries[0].id)
  

  console.log("ISO sample:", iso[0]['country-code'], iso[0]['alpha-3'])
  

  console.log("Data sample:", raw[0].Code, raw[0].Year)

  return {
    geojson_id_sample: countries.slice(0,3).map(d => d.id),
    iso_sample: iso.slice(0,3).map(d => ({code: d['country-code'], alpha3: d['alpha-3']})),
    data_sample: raw.slice(0,3).map(d => ({code: d.Code, year: d.Year}))
  }
}


async function _6(topojson)
{
  const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(r => r.json())

  const iso = await fetch("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json")
    .then(r => r.json())

  const countries = topojson.feature(world, world.objects.countries).features

  // test first 5 countries
  return countries.slice(0, 5).map(d => {
    const padded = String(+d.id).padStart(3, '0')
    const found = iso.find(c => c['country-code'] === padded)
    return {
      geojson_id: d.id,
      padded: padded,
      found_alpha3: found?.['alpha-3'],
      found_name: found?.name
    }
  })
}


async function _7(d3)
{
  const raw = await fetch("https://ourworldindata.org/grapher/life-expectancy.csv")
    .then(r => r.text())
    .then(text => d3.csvParse(text))

  const valueCol = "Period life expectancy at birth - Sex: all - Age: 0"
  
  // ببین key های dataMap چه شکلیه
  const sample = raw.slice(0, 3)
  
  return sample.map(d => ({
    key: `${d.Code}_${d.Year}`,
    value: d[valueCol],
    allColumns: Object.keys(d)
  }))
}


async function _8(d3)
{
  const raw = await fetch("https://ourworldindata.org/grapher/life-expectancy.csv")
    .then(r => r.text())
    .then(text => d3.csvParse(text))

  return Object.keys(raw[0])
}


async function _9(d3,topojson)
{
  const lifeData = await fetch("https://ourworldindata.org/grapher/life-expectancy.csv")
    .then(r => r.text())
    .then(text => d3.csvParse(text))

  const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(r => r.json())

  const iso = await fetch("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json")
    .then(r => r.json())

  const valueCol = "Life expectancy"
  const years = [...new Set(lifeData.map(d => +d.Year))].sort()
  const dataMap = new Map(lifeData.map(d => [`${d.Code}_${d.Year}`, +d[valueCol]]))
  const entities = [...new Set(lifeData.map(d => d.Entity))].sort()

  const width = 900, height = 460
  let currentYear = 2000
  let playing = false
  let timer = null
  let activeTab = "map"

  const colorScale = d3.scaleSequential()
    .domain([30, 85])
    .interpolator(d3.interpolateRdYlGn)

  const projection = d3.geoNaturalEarth1()
    .scale(153).translate([width / 2, height / 2])

  const path = d3.geoPath().projection(projection)
  const countries = topojson.feature(world, world.objects.countries).features

  const getAlpha3 = (d) =>
    iso.find(c => c['country-code'] === String(+d.id).padStart(3, '0'))?.['alpha-3']

  // ── CONTAINER ──
  const container = d3.select(document.createElement("div"))
    .style("font-family", "sans-serif")
    .style("background", "#1a1a2e")
    .style("color", "#fff")
    .style("border-radius", "10px")
    .style("overflow", "hidden")
    .style("width", width + "px")

  // ── TITLE ──
  container.append("div")
    .style("padding", "16px 20px 8px")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Life Expectancy Around the World")

  // ── TABS ──
  const tabBar = container.append("div")
    .style("display", "flex")
    .style("gap", "4px")
    .style("padding", "0 20px")
    .style("border-bottom", "1px solid rgba(255,255,255,0.1)")

  const tabDefs = ["map", "line", "table"]

  const tabButtons = tabBar.selectAll("div")
    .data(tabDefs)
    .join("div")
    .text(d => d === "map" ? "🗺 Map" : d === "line" ? "📈 Line" : "📋 Table")
    .style("padding", "8px 16px")
    .style("cursor", "pointer")
    .style("font-size", "13px")
    .style("border-bottom", d => d === activeTab ? "2px solid #e94560" : "2px solid transparent")
    .style("color", d => d === activeTab ? "#e94560" : "#aaa")
    .on("click", function(event, d) {
      activeTab = d
      tabButtons
        .style("border-bottom", t => t === d ? "2px solid #e94560" : "2px solid transparent")
        .style("color", t => t === d ? "#e94560" : "#aaa")
      mapSection.style("display", d === "map" ? "block" : "none")
      lineSection.style("display", d === "line" ? "block" : "none")
      tableSection.style("display", d === "table" ? "block" : "none")
    })

  // ── CONTROLS ──
  const controls = container.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "12px")
    .style("padding", "10px 20px")
    .style("background", "rgba(255,255,255,0.05)")

  const btn = controls.append("button")
    .text("▶ Play")
    .style("padding", "6px 16px")
    .style("background", "#e94560")
    .style("color", "#fff")
    .style("border", "none")
    .style("border-radius", "4px")
    .style("cursor", "pointer")
    .style("font-size", "13px")

  const slider = controls.append("input")
    .attr("type", "range")
    .attr("min", years[0])
    .attr("max", years[years.length - 1])
    .attr("value", currentYear)
    .attr("step", 1)
    .style("width", "500px")

  const yearDisplay = controls.append("span")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text(currentYear)

  // ── MAP SECTION ──
  const mapSection = container.append("div")

  const svg = mapSection.append("svg")
    .attr("width", width).attr("height", height)

  svg.append("rect")
    .attr("width", width).attr("height", height)
    .attr("fill", "#0f3460")

  const mapPaths = svg.selectAll("path")
    .data(countries).join("path")
    .attr("d", path)
    .attr("stroke", "#ffffff22")
    .attr("stroke-width", 0.5)

  const yearLabel = svg.append("text")
    .attr("x", width - 20).attr("y", height - 20)
    .attr("text-anchor", "end")
    .attr("font-size", 56).attr("font-weight", "bold")
    .attr("fill", "rgba(255,255,255,0.08)")

  // legend
  const defs = svg.append("defs")
  const grad = defs.append("linearGradient").attr("id", "le-grad")
  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop").attr("offset", t)
      .attr("stop-color", colorScale(30 + t * 55))
  })
  const lg = svg.append("g").attr("transform", "translate(20,420)")
  lg.append("rect").attr("width", 200).attr("height", 10).style("fill", "url(#le-grad)")
  lg.append("text").attr("x", 0).attr("y", 25).attr("fill", "#fff").attr("font-size", 11).text("30 yrs")
  lg.append("text").attr("x", 100).attr("y", 25).attr("fill", "#fff").attr("font-size", 11).attr("text-anchor", "middle").text("57 yrs")
  lg.append("text").attr("x", 200).attr("y", 25).attr("fill", "#fff").attr("font-size", 11).attr("text-anchor", "end").text("85 yrs")
  lg.append("text").attr("x", 100).attr("y", -5).attr("fill", "#fff").attr("font-size", 11).attr("text-anchor", "middle").text("Life Expectancy")

  // tooltip
  const tooltip = d3.select(document.createElement("div"))
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.85)")
    .style("color", "#fff")
    .style("padding", "8px 12px")
    .style("border-radius", "6px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("border", "1px solid #e94560")

  mapPaths
    .on("mousemove", (event, d) => {
      const alpha3 = getAlpha3(d)
      const val = dataMap.get(`${alpha3}_${currentYear}`)
      const name = iso.find(c => c['country-code'] === String(+d.id).padStart(3, '0'))?.name
      tooltip
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 30) + "px")
        .html(val !== undefined
          ? `<b>${name}</b><br>Life Expectancy: <b>${val.toFixed(1)} years</b><br>Year: ${currentYear}`
          : `<b>${name}</b><br>No data`)
    })
    .on("mouseleave", () => tooltip.style("display", "none"))

  // ── LINE SECTION ──
  const lineSection = container.append("div")
    .style("display", "none")
    .style("padding", "20px")

  lineSection.append("div")
    .style("margin-bottom", "8px")
    .style("font-size", "13px")
    .style("color", "#aaa")
    .text("Select a country to see its life expectancy over time:")

  const countrySelect = lineSection.append("select")
    .style("background", "#0f3460")
    .style("color", "#fff")
    .style("border", "1px solid #e94560")
    .style("padding", "4px 8px")
    .style("border-radius", "4px")
    .style("margin-bottom", "12px")
    .style("font-size", "13px")

  countrySelect.selectAll("option")
    .data(entities).join("option")
    .attr("value", d => d)
    .text(d => d)

  const lineSvg = lineSection.append("svg")
    .attr("width", width - 40).attr("height", 350)

  function drawLine(entity) {
    lineSvg.selectAll("*").remove()
    const filtered = lifeData
      .filter(d => d.Entity === entity && d[valueCol])
      .map(d => ({year: +d.Year, val: +d[valueCol]}))
      .sort((a, b) => a.year - b.year)

    const lw = width - 80, lh = 300
    const xScale = d3.scaleLinear().domain(d3.extent(filtered, d => d.year)).range([50, lw])
    const yScale = d3.scaleLinear().domain([0, 90]).range([lh, 20])

    // grid lines
    lineSvg.selectAll(".grid")
      .data(yScale.ticks(5))
      .join("line")
      .attr("x1", 50).attr("x2", lw)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "rgba(255,255,255,0.05)")
      .attr("stroke-width", 1)

    lineSvg.append("g")
      .attr("transform", `translate(0,${lh})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text").style("fill", "#aaa").style("font-size", "11px")

    lineSvg.append("g")
      .attr("transform", "translate(50,0)")
      .call(d3.axisLeft(yScale).tickFormat(d => d + " yrs"))
      .selectAll("text").style("fill", "#aaa").style("font-size", "11px")

    // area
    lineSvg.append("path")
      .datum(filtered)
      .attr("fill", "rgba(233,69,96,0.15)")
      .attr("d", d3.area().x(d => xScale(d.year)).y0(lh).y1(d => yScale(d.val)))

    // line
    lineSvg.append("path")
      .datum(filtered)
      .attr("fill", "none")
      .attr("stroke", "#e94560")
      .attr("stroke-width", 2.5)
      .attr("d", d3.line().x(d => xScale(d.year)).y(d => yScale(d.val))
        .curve(d3.curveCatmullRom))

    // current year marker
    const currentVal = filtered.find(d => d.year === currentYear)
    if (currentVal) {
      lineSvg.append("circle")
        .attr("cx", xScale(currentVal.year))
        .attr("cy", yScale(currentVal.val))
        .attr("r", 5)
        .attr("fill", "#e94560")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)

      lineSvg.append("text")
        .attr("x", xScale(currentVal.year) + 10)
        .attr("y", yScale(currentVal.val) - 8)
        .attr("fill", "#fff")
        .attr("font-size", 12)
        .text(`${currentYear}: ${currentVal.val.toFixed(1)} yrs`)
    }

    lineSvg.append("text")
      .attr("x", (lw + 50) / 2).attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff").attr("font-size", 14).attr("font-weight", "bold")
      .text(`${entity} — Life Expectancy`)
  }

  drawLine("World")
  countrySelect.on("change", function() { drawLine(this.value) })

  // ── TABLE SECTION ──
  const tableSection = container.append("div")
    .style("display", "none")
    .style("padding", "20px")
    .style("max-height", "420px")
    .style("overflow-y", "auto")

  function drawTable(year) {
    tableSection.selectAll("*").remove()

    tableSection.append("div")
      .style("font-size", "15px")
      .style("font-weight", "bold")
      .style("margin-bottom", "12px")
      .text(`Life Expectancy by Country — ${year}`)

    const yearData = lifeData
      .filter(d => +d.Year === year && d[valueCol])
      .map(d => ({entity: d.Entity, code: d.Code, val: +d[valueCol]}))
      .sort((a, b) => b.val - a.val)

    const table = tableSection.append("table")
      .style("width", "100%")
      .style("border-collapse", "collapse")
      .style("font-size", "13px")

    const thead = table.append("thead").append("tr")
    ;["#", "Country", "Life Expectancy (years)"].forEach(col => {
      thead.append("th")
        .style("text-align", "left")
        .style("padding", "8px 12px")
        .style("border-bottom", "1px solid rgba(255,255,255,0.2)")
        .style("color", "#e94560")
        .style("position", "sticky")
        .style("top", "0")
        .style("background", "#1a1a2e")
        .text(col)
    })

    const tbody = table.append("tbody")
    yearData.forEach((d, i) => {
      const row = tbody.append("tr")
        .style("border-bottom", "1px solid rgba(255,255,255,0.05)")
        .on("mouseover", function() { d3.select(this).style("background", "rgba(233,69,96,0.1)") })
        .on("mouseout", function() { d3.select(this).style("background", "transparent") })

      row.append("td").style("padding", "6px 12px").style("color", "#666").text(i + 1)
      row.append("td").style("padding", "6px 12px").text(d.entity)

      const valCell = row.append("td").style("padding", "6px 12px")

      // mini bar
      const barWidth = Math.round((d.val / 90) * 150)
      valCell.append("span")
        .style("display", "inline-block")
        .style("width", barWidth + "px")
        .style("height", "8px")
        .style("background", colorScale(d.val))
        .style("border-radius", "4px")
        .style("margin-right", "8px")
        .style("vertical-align", "middle")

      valCell.append("span").text(d.val.toFixed(1) + " yrs")
    })
  }

  drawTable(currentYear)

  // ── UPDATE ──
  function update(year) {
    currentYear = year
    yearLabel.text(year)
    mapPaths.transition().duration(100)
      .attr("fill", d => {
        const alpha3 = getAlpha3(d)
        const val = dataMap.get(`${alpha3}_${year}`)
        return val !== undefined ? colorScale(val) : "#333"
      })
    slider.property("value", year)
    yearDisplay.text(year)
    drawTable(year)
    if (activeTab === "line") drawLine(countrySelect.property("value"))
  }

  btn.on("click", () => {
    playing = !playing
    btn.text(playing ? "⏸ Pause" : "▶ Play")
    if (playing) {
      timer = d3.interval(() => {
        let idx = years.indexOf(currentYear)
        if (idx >= years.length - 1) {
          playing = false; btn.text("▶ Play"); timer.stop(); return
        }
        update(years[idx + 1])
      }, 150)
    } else {
      if (timer) timer.stop()
    }
  })

  slider.on("input", function() {
    if (timer) timer.stop()
    playing = false; btn.text("▶ Play")
    update(+this.value)
  })

  document.body.appendChild(tooltip.node())
  update(currentYear)

  return container.node()
}


export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("topojson")).define("topojson", ["require"], _topojson);
  main.variable(observer("iso")).define("iso", _iso);
  main.variable(observer()).define(["d3","topojson"], _4);
  main.variable(observer()).define(["d3","topojson"], _5);
  main.variable(observer()).define(["topojson"], _6);
  main.variable(observer()).define(["d3"], _7);
  main.variable(observer()).define(["d3"], _8);
  main.variable(observer()).define(["d3","topojson"], _9);
  return main;
}
