// This is a data loader that will convert the CSV to JSON at build time
import * as fs from 'fs'
import * as d3 from 'd3'

// Read the CSV file
const csvData = fs.readFileSync('src/data/makeblob.csv', 'utf-8')

// Parse the CSV data
const blobData = d3.csvParse(csvData, (d) => ({
  index: +d.index,
  X: +d.X,
  Y: +d.Y,
}))

// Log the number of data points for debugging to stderr (not stdout)
console.error(`Processed ${blobData.length} blob data points from CSV`)

// Output only the JSON to stdout
process.stdout.write(JSON.stringify(blobData))
