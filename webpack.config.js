const path = require("path");

module.exports = {
  entry: "./User/script.js", // Set the entry point to User/script.js
  output: {
    path: path.resolve(__dirname, "dist"), // Output the bundle to the dist directory
    filename: "bundle.js", // Name of the output bundle
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader", // Use Babel to transpile JavaScript
        },
      },
      {
        test: /\.css$/, // Load CSS files
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(html)$/, // Load HTML files
        use: {
          loader: "html-loader",
        },
      },
    ],
  },
  resolve: {
    alias: {
      // Add any necessary aliases here if needed
    },
  },
  devServer: {
    contentBase: path.resolve(__dirname, "dist"), // Set the content base for development server
    open: true, // Automatically open the browser on server start
    port: 9000, // Port for the dev server
  },
  mode: "production", // Set the mode to production
};
