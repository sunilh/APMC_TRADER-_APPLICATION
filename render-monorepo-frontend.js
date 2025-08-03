#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('🎯 Building frontend for Render from monorepo...');

// Handle Render's directory structure - find root with package.json
const currentDir = process.cwd();
console.log('🔍 Current directory:', currentDir);

// Render may start from different working directories, search thoroughly
let rootDir = currentDir;
const searchPaths = [
  currentDir,
  path.dirname(currentDir),
  path.join(currentDir, 'src'),
  '/opt/render/project/src'
];

console.log('🔍 Searching for package.json in:', searchPaths);

let foundPackageJson = false;
for (const searchPath of searchPaths) {
  const packagePath = path.join(searchPath, 'package.json');
  console.log(`  Checking: ${packagePath}`);
  if (fs.existsSync(packagePath)) {
    rootDir = searchPath;
    foundPackageJson = true;
    console.log(`✓ Found package.json at: ${packagePath}`);
    break;
  }
}

if (!foundPackageJson) {
  // Last resort: search from filesystem root
  try {
    const { execSync } = await import('child_process');
    const findResult = execSync('find /opt/render -name "package.json" 2>/dev/null || true', { encoding: 'utf8' });
    console.log('🔍 Find results:', findResult);
  } catch (e) {
    console.log('Find command failed, continuing with current directory');
  }
  
  console.error('❌ Could not find package.json in any expected location');
  console.error('Available files in current directory:');
  try {
    console.error(fs.readdirSync(currentDir));
  } catch (e) {
    console.error('Cannot read current directory');
  }
  process.exit(1);
}

console.log('🔍 Root directory with package.json:', rootDir);
process.chdir(rootDir);
console.log('✓ Changed to root directory');

// Clean existing build directories
const distDir = path.join(rootDir, 'dist');
const clientDistDir = path.join(rootDir, 'client', 'dist');

console.log('🧹 Cleaning build directories...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
if (fs.existsSync(clientDistDir)) {
  fs.rmSync(clientDistDir, { recursive: true, force: true });
}

try {
  console.log('📦 Ensuring all dependencies are installed...');
  execSync('npm install', { 
    cwd: rootDir, 
    stdio: 'inherit'
  });
  
  console.log('🔍 Checking for Vite installation...');
  try {
    execSync('npx vite --version', { 
      cwd: rootDir, 
      stdio: 'inherit'
    });
  } catch (viteError) {
    console.log('⚠️ Vite not found, installing build dependencies...');
    execSync('npm install vite @vitejs/plugin-react typescript @replit/vite-plugin-runtime-error-modal @replit/vite-plugin-cartographer', { 
      cwd: rootDir, 
      stdio: 'inherit'
    });
  }
  
  console.log('🔍 Ensuring PostCSS dependencies are installed...');
  try {
    execSync('npm install autoprefixer postcss tailwindcss', { 
      cwd: rootDir, 
      stdio: 'inherit'
    });
  } catch (postcssError) {
    console.log('⚠️ PostCSS installation failed, continuing...');
  }
  
  console.log('⚡ Building frontend with Vite (direct approach)...');
  
  // Build from client directory using correct Vite CLI approach
  const clientDir = path.join(rootDir, 'client');
  const outputDir = path.join(rootDir, 'dist', 'public');
  
  console.log('📁 Client directory:', clientDir);
  console.log('📁 Output directory:', outputDir);
  
  // Ensure client directory exists
  if (!fs.existsSync(clientDir)) {
    throw new Error('Client directory not found at: ' + clientDir);
  }
  
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Create a simple vite config in client directory
  const clientViteConfig = path.join(clientDir, 'vite.config.js');
  const clientPostCSSConfig = path.join(clientDir, 'postcss.config.js');
  
  const simpleConfig = `
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcssPlugin from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "@shared": path.resolve(process.cwd(), "../shared"),
      "@assets": path.resolve(process.cwd(), "../attached_assets"),
    },
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  },
  base: '',
  css: {
    postcss: {
      plugins: [
        tailwindcssPlugin,
        autoprefixer,
      ],
    },
    transformer: 'postcss',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
`;

  const postCSSConfig = `
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
`;
  
  console.log('📝 Creating simple Vite config in client directory...');
  fs.writeFileSync(clientViteConfig, simpleConfig);
  
  // Install Tailwind and React dependencies in client directory
  console.log('📦 Installing Tailwind and React dependencies in client directory...');
  const clientPackageJson = path.join(clientDir, 'package.json');
  if (!fs.existsSync(clientPackageJson)) {
    const minimalPackage = {
      "name": "client",
      "version": "1.0.0",
      "type": "module"
    };
    fs.writeFileSync(clientPackageJson, JSON.stringify(minimalPackage, null, 2));
  }
  
  try {
    execSync('npm install @vitejs/plugin-react @tailwindcss/postcss autoprefixer tailwindcss postcss', { 
      cwd: clientDir, 
      stdio: 'inherit'
    });
  } catch (installError) {
    console.log('⚠️ Tailwind installation in client failed...');
  }
  
  // Copy Tailwind config from root to client directory
  const rootTailwindConfig = path.join(rootDir, 'tailwind.config.ts');
  const clientTailwindConfig = path.join(clientDir, 'tailwind.config.ts');
  if (fs.existsSync(rootTailwindConfig)) {
    console.log('📝 Copying Tailwind config to client directory...');
    let tailwindContent = fs.readFileSync(rootTailwindConfig, 'utf8');
    // Fix content paths for client directory context
    tailwindContent = tailwindContent.replace(
      '"./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"',
      '"./index.html", "./src/**/*.{js,jsx,ts,tsx}"'
    );
    fs.writeFileSync(clientTailwindConfig, tailwindContent);
  }
  
  // Ensure proper HTML template is used during build
  const sourceHtmlPath = path.join(clientDir, 'index.html');
  if (fs.existsSync(sourceHtmlPath)) {
    const htmlContent = fs.readFileSync(sourceHtmlPath, 'utf8');
    console.log('📝 Using enhanced HTML template for build');
    console.log('📄 Source HTML preview:', htmlContent.substring(0, 300) + '...');
  }
  
  try {
    // Build from client directory where the config and source files are
    console.log('🔧 Running vite build from client directory...');
    execSync('npx vite build', { 
      stdio: 'inherit',
      cwd: clientDir, // Change working directory to client
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        VITE_API_URL: 'https://traderapp-8lkr.onrender.com', // Production backend URL
        REPL_ID: undefined // Remove Replit-specific env vars
      }
    });
  } finally {
    // Clean up temp configs and client dependencies
    if (fs.existsSync(clientViteConfig)) {
      fs.unlinkSync(clientViteConfig);
    }
    const clientTailwindConfig = path.join(clientDir, 'tailwind.config.ts');
    if (fs.existsSync(clientTailwindConfig)) {
      fs.unlinkSync(clientTailwindConfig);
    }
    const clientPackageJson = path.join(clientDir, 'package.json');
    if (fs.existsSync(clientPackageJson)) {
      fs.unlinkSync(clientPackageJson);
    }
    const clientNodeModules = path.join(clientDir, 'node_modules');
    if (fs.existsSync(clientNodeModules)) {
      fs.rmSync(clientNodeModules, { recursive: true, force: true });
    }
  }
  
  // Check where Vite created the files - try both dist/public and dist/
  const publicDir = path.join(rootDir, 'dist', 'public');
  const directDistDir = path.join(rootDir, 'dist');
  
  let sourceDir;
  if (fs.existsSync(publicDir) && fs.existsSync(path.join(publicDir, 'index.html'))) {
    sourceDir = publicDir;
    console.log('📁 Found build files in dist/public/');
  } else if (fs.existsSync(directDistDir) && fs.existsSync(path.join(directDistDir, 'index.html'))) {
    sourceDir = directDistDir;
    console.log('📁 Found build files in dist/');
  } else {
    throw new Error('Vite build output not found in dist/public or dist/');
  }
  
  // Create client/dist and copy files there for Render
  fs.mkdirSync(clientDistDir, { recursive: true });
  
  const files = fs.readdirSync(sourceDir);
  console.log(`📁 Copying ${files.length} files to client/dist...`);
  
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(clientDistDir, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      fs.cpSync(sourcePath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
  
  console.log('📦 Files copied to client/dist');
  
  // Verify build success and CSS loading
  const indexPath = path.join(clientDistDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    if (indexContent.includes('<!doctype html') || indexContent.includes('<!DOCTYPE html')) {
      console.log('✓ Valid index.html created');
    }
    
    // Check for CSS files in the HTML
    if (indexContent.includes('.css')) {
      console.log('✓ CSS files properly linked in HTML');
    } else {
      console.log('⚠️ Warning: No CSS files found in HTML - checking assets...');
    }
    
    // Fix absolute paths to relative paths in HTML for production
    let fixedHtml = indexContent;
    fixedHtml = fixedHtml.replace(/href="\/assets\//g, 'href="./assets/');
    fixedHtml = fixedHtml.replace(/src="\/assets\//g, 'src="./assets/');
    
    // Ensure proper HTML structure with title and meta tags
    if (!fixedHtml.includes('<title>APMC Trader')) {
      console.log('⚠️ Missing enhanced HTML template - adding title and meta tags');
      fixedHtml = fixedHtml.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />',
        `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>APMC Trader - Agricultural Market Management</title>
    <meta name="description" content="Comprehensive agricultural trading application for APMC operations with farmer registration, lot tracking, and financial management." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`
      );
    }
    
    // Remove the replit development banner from production
    fixedHtml = fixedHtml.replace(/<!-- This is a replit script.*?<\/script>/gs, '');
    fixedHtml = fixedHtml.replace(/<script type="text\/javascript" src="https:\/\/replit\.com\/public\/js\/replit-dev-banner\.js"><\/script>/g, '');
    
    // Ensure CSS is properly linked (double-check for production)
    const assetsDir = path.join(clientDistDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
      if (cssFiles.length > 0 && !fixedHtml.includes('stylesheet')) {
        console.log('⚠️ CSS files exist but not linked - manually adding CSS link');
        const cssFile = cssFiles[0];
        fixedHtml = fixedHtml.replace(
          '</head>',
          `    <link rel="stylesheet" crossorigin href="./assets/${cssFile}">
  </head>`
        );
      }
    }
    
    if (fixedHtml !== indexContent) {
      console.log('🔧 Fixed HTML template and asset paths for production');
      fs.writeFileSync(indexPath, fixedHtml);
    }
    
    // Log a preview of the HTML for debugging
    console.log('📄 HTML preview (first 800 chars):');
    console.log(fixedHtml.substring(0, 800));
    
    const assetsDir = path.join(clientDistDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      const assetFiles = fs.readdirSync(assetsDir);
      const cssFiles = assetFiles.filter(f => f.endsWith('.css'));
      const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
      
      console.log(`✓ ${assetFiles.length} asset files built`);
      console.log(`✓ ${cssFiles.length} CSS files: ${cssFiles.join(', ')}`);
      console.log(`✓ ${jsFiles.length} JS files: ${jsFiles.slice(0, 3).join(', ')}${jsFiles.length > 3 ? '...' : ''}`);
      
      if (cssFiles.length === 0) {
        console.log('⚠️ WARNING: No CSS files found! This will cause styling issues.');
      } else {
        // Check if CSS files have content
        cssFiles.forEach(cssFile => {
          const cssPath = path.join(assetsDir, cssFile);
          const cssStats = fs.statSync(cssPath);
          console.log(`📄 ${cssFile}: ${cssStats.size} bytes`);
          if (cssStats.size < 1000) {
            console.log(`⚠️ WARNING: ${cssFile} seems too small - possible CSS compilation issue`);
          }
        });
      }
    } else {
      console.log('⚠️ No assets directory found');
    }
    
    console.log('✅ Frontend build completed successfully');
  } else {
    throw new Error('index.html not found in client/dist');
  }
  
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}

console.log('🚀 Frontend ready for Render deployment');
