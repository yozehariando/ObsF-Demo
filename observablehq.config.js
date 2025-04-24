// See https://observablehq.com/framework/config for documentation.
export default {
  // The app's title; used in the sidebar and webpage titles.
  title: 'DNA Mutation Analysis Dashboard',

  // The pages and sections in the sidebar. If you don't specify this option,
  // all pages will be listed in alphabetical order. Listing pages explicitly
  // lets you organize them into sections and have unlisted pages.
  pages: [
    {
      name: 'Dashboard',
      path: '/',
    },
    {
      name: 'Phylogenetic Analysis',
      path: '/phylogenetic',
    },
    {
      name: 'Phylogenetic Analysis - phylotree',
      path: '/phylotree-visualization',
    },
  ],

  // Content to add to the head of the page, e.g. for a favicon:
  head: '<link rel="icon" href="images/observable.png" type="image/png" sizes="32x32">',

  // The path to the source root.
  root: 'src',

  // Some additional configuration options and their defaults:
  theme: 'dashboard', // Using dashboard theme by default
  sidebar: true, // Show the sidebar to access individual visualizations
  toc: false, // No table of contents needed for the dashboard
  pager: false, // No need for pager in a dashboard
  search: false, // Disable search for cleaner interface
}
