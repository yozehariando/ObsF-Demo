// This is a data loader that will convert the CSV to JSON at build time
import * as fs from 'fs'
import * as d3 from 'd3'

// Read the CSV file
const csvData = fs.readFileSync('src/data/fake_latlon.csv', 'utf-8')

// Parse the CSV data
const mutations = d3.csvParse(csvData, (d) => ({
  index: +d.index,
  latitude: +d.latitude,
  longitude: +d.longitude,
  DNA_mutation_code: d.DNA_mutation_code,
  random_float: +d.random_float,
}))

// Log the number of data points for debugging to stderr (not stdout)
console.error(`Processed ${mutations.length} data points from CSV`)

// Output only the JSON to stdout
process.stdout.write(JSON.stringify(mutations))
