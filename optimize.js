#!/usr/bin/env node

const { build } = require('esbuild');
const { minify } = require('terser');
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function parseCLIArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputFile: null,
    output: null,
    babel: true,  // Enable Babel transpiling by default
    terser: true, // Enable Terser minification by default
    esbuild: true // Enable esbuild bundling by default
  };

  args.forEach((arg, index) => {
    switch (arg) {
      case '--babel':
        options.babel = args[index + 1] === 'true';
        break;
      case '--terser':
        options.terser = args[index + 1] === 'true';
        break;
      case '--esbuild':
        options.esbuild = args[index + 1] === 'true';
        break;
      case '--output':
        options.output = args[index + 1];
        break;
      default:
        if (!options.inputFile) {
          options.inputFile = arg;
        }
    }
  });

  if (!options.inputFile) {
    console.error('Error: Please specify a JavaScript file to optimize.');
    process.exit(1);
  }

  return options;
}

async function runLayeredOptimization(inputFile, outputFile, options) {
  try {
    // Step 1: Read the input file
    let code = fs.readFileSync(inputFile, 'utf-8');
    console.log(`${colors.blue}Reading input file: ${inputFile}${colors.reset}`);

    // Step 2: Transpile with Babel if enabled
    if (options.babel) {
      console.log(`${colors.green}Transpiling with Babel...${colors.reset}`);
      const babelOutput = babel.transformSync(code, {
        presets: ['@babel/preset-env'],
      });
      code = babelOutput.code;
      console.log(`${colors.green}Transpiling completed.${colors.reset}`);
    }

    // Step 3: Minify with Terser if enabled
    if (options.terser) {
      console.log(`${colors.yellow}Minifying with Terser...${colors.reset}`);
      const terserOutput = await minify(code);
      code = terserOutput.code;
      console.log(`${colors.yellow}Minification completed.${colors.reset}`);
    }

    // Step 4: Bundle with esbuild if enabled
    if (options.esbuild) {
      console.log(`${colors.magenta}Bundling with esbuild...${colors.reset}`);
      const esbuildResult = await build({
        stdin: {
          contents: code,
          resolveDir: path.dirname(inputFile),
        },
        bundle: true,
        minify: options.terser, // Optional second minification step by esbuild
        write: false,
      });
      code = esbuildResult.outputFiles[0].text;
      console.log(`${colors.magenta}Bundling completed.${colors.reset}`);
    }

    // Step 5: Write the final bundled and optimized output to a file
    fs.writeFileSync(outputFile, code);
    console.log(`${colors.cyan}File optimized successfully. Output: ${outputFile}${colors.reset}`);
  } catch (err) {
    console.error(`${colors.red}Error during optimization:${colors.reset}`, err);
  }
}

function main() {
  const options = parseCLIArgs();
  const inputFile = options.inputFile;
  const outputFile = options.output || `${path.basename(inputFile, '.js')}.bundle.min.js`;

  runLayeredOptimization(inputFile, outputFile, options);
}

main();
