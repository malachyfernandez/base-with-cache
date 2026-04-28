#!/usr/bin/env node
/**
 * SVG ViewBox Fitter
 * 
 * Analyzes SVG path data to find bounds, then adjusts viewBox to tightly fit
 * the content. The original path data is preserved - only viewBox changes.
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse SVG path and extract all coordinate points to find bounds
 */
function getPathBounds(d) {
    // Normalize: add spaces between tokens for easier parsing
    // Handle compact notation like "-.316" and "c-9.068-.316"
    let normalized = d
        .replace(/([0-9])([A-Za-z])/g, '$1 $2')      // number followed by command
        .replace(/([A-Za-z])([-0-9])/g, '$1 $2')     // command followed by number/minus
        .replace(/([0-9])-/g, '$1 -')               // number followed by minus
        .replace(/e -/g, 'e-');                      // fix scientific notation
    
    // Handle "-.316" style numbers - add 0 before the decimal
    normalized = normalized.replace(/(\s|^)-\.(\d+)/g, '$1-0.$2');
    
    // Tokenize
    const tokens = normalized.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/g) || [];
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let currentX = 0, currentY = 0;
    let startX = 0, startY = 0;
    let lastCmd = '';
    
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        
        if (/[MmLlHhVvCcSsQqTtAaZz]/.test(token)) {
            lastCmd = token;
            if (token.toLowerCase() === 'z') {
                currentX = startX;
                currentY = startY;
            }
            i++;
            continue;
        }
        
        const num = parseFloat(token);
        if (isNaN(num)) {
            i++;
            continue;
        }
        
        const cmd = lastCmd.toLowerCase();
        const isRelative = lastCmd === lastCmd.toLowerCase();
        let consumed = 1;
        
        let x, y, cp1x, cp1y, cp2x, cp2y;
        
        switch (cmd) {
            case 'm':
                if (i + 1 < tokens.length) {
                    x = num;
                    y = parseFloat(tokens[i + 1]);
                    if (isRelative) { x += currentX; y += currentY; }
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    currentX = x; currentY = y;
                    startX = x; startY = y;
                    // Subsequent m pairs are treated as lineto
                    if (lastCmd === 'm') lastCmd = 'l';
                    else if (lastCmd === 'M') lastCmd = 'L';
                    consumed = 2;
                }
                break;
                
            case 'l':
                if (i + 1 < tokens.length) {
                    x = num;
                    y = parseFloat(tokens[i + 1]);
                    if (isRelative) { x += currentX; y += currentY; }
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    currentX = x; currentY = y;
                    consumed = 2;
                }
                break;
                
            case 'h':
                x = num;
                if (isRelative) x += currentX;
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, currentY); maxY = Math.max(maxY, currentY);
                currentX = x;
                break;
                
            case 'v':
                y = num;
                if (isRelative) y += currentY;
                minX = Math.min(minX, currentX); maxX = Math.max(maxX, currentX);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                currentY = y;
                break;
                
            case 'c':
                if (i + 5 < tokens.length) {
                    cp1x = num;
                    cp1y = parseFloat(tokens[i + 1]);
                    cp2x = parseFloat(tokens[i + 2]);
                    cp2y = parseFloat(tokens[i + 3]);
                    x = parseFloat(tokens[i + 4]);
                    y = parseFloat(tokens[i + 5]);
                    
                    if (isRelative) {
                        cp1x += currentX; cp1y += currentY;
                        cp2x += currentX; cp2y += currentY;
                        x += currentX; y += currentY;
                    }
                    
                    minX = Math.min(minX, cp1x, cp2x, x);
                    maxX = Math.max(maxX, cp1x, cp2x, x);
                    minY = Math.min(minY, cp1y, cp2y, y);
                    maxY = Math.max(maxY, cp1y, cp2y, y);
                    
                    currentX = x; currentY = y;
                    consumed = 6;
                }
                break;
                
            case 's':
                if (i + 3 < tokens.length) {
                    cp2x = num;
                    cp2y = parseFloat(tokens[i + 1]);
                    x = parseFloat(tokens[i + 2]);
                    y = parseFloat(tokens[i + 3]);
                    
                    if (isRelative) {
                        cp2x += currentX; cp2y += currentY;
                        x += currentX; y += currentY;
                    }
                    
                    minX = Math.min(minX, cp2x, x);
                    maxX = Math.max(maxX, cp2x, x);
                    minY = Math.min(minY, cp2y, y);
                    maxY = Math.max(maxY, cp2y, y);
                    
                    currentX = x; currentY = y;
                    consumed = 4;
                }
                break;
                
            case 'q':
                if (i + 3 < tokens.length) {
                    cp1x = num;
                    cp1y = parseFloat(tokens[i + 1]);
                    x = parseFloat(tokens[i + 2]);
                    y = parseFloat(tokens[i + 3]);
                    
                    if (isRelative) {
                        cp1x += currentX; cp1y += currentY;
                        x += currentX; y += currentY;
                    }
                    
                    minX = Math.min(minX, cp1x, x);
                    maxX = Math.max(maxX, cp1x, x);
                    minY = Math.min(minY, cp1y, y);
                    maxY = Math.max(maxY, cp1y, y);
                    
                    currentX = x; currentY = y;
                    consumed = 4;
                }
                break;
                
            case 't':
                if (i + 1 < tokens.length) {
                    x = num;
                    y = parseFloat(tokens[i + 1]);
                    if (isRelative) { x += currentX; y += currentY; }
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    currentX = x; currentY = y;
                    consumed = 2;
                }
                break;
                
            case 'a':
                if (i + 6 < tokens.length) {
                    // Skip rx, ry, rotation, large-arc, sweep
                    x = parseFloat(tokens[i + 5]);
                    y = parseFloat(tokens[i + 6]);
                    if (isRelative) { x += currentX; y += currentY; }
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    currentX = x; currentY = y;
                    consumed = 7;
                }
                break;
        }
        
        i += consumed;
    }
    
    return {
        minX: isFinite(minX) ? minX : 0,
        minY: isFinite(minY) ? minY : 0,
        maxX: isFinite(maxX) ? maxX : 100,
        maxY: isFinite(maxY) ? maxY : 100,
        width: isFinite(maxX - minX) ? maxX - minX : 100,
        height: isFinite(maxY - minY) ? maxY - minY : 100
    };
}

function generateComponent(name, viewBox, pathData) {
    return `import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";

interface IconProps extends SvgProps {
  color?: string;
  strokeWidth?: number;
}

const ${name} = ({ color = "#000", strokeWidth = 0, ...props }: IconProps) => (
  <Svg viewBox="${viewBox}" {...props}>
    <Path
      fill={color}
      stroke={color}
      strokeWidth={strokeWidth}
      d="${pathData}"
    />
  </Svg>
);
export default ${name};
`;
}

// Main
const svgDir = process.argv[2] || "/Users/malachyfernandez/Documents/1-programing/wolfspoint-extra/ideas and icons/vectors for icons";
const outputDir = process.argv[3] || "/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/icons";

const files = [
  { svg: 'Newspaper.svg', component: 'Newspaper.tsx', name: 'SvgNewspaper' },
  { svg: 'Nightly.svg', component: 'Nightly.tsx', name: 'SvgNightly' },
  { svg: 'Players.svg', component: 'Players.tsx', name: 'SvgPlayers' },
  { svg: 'Roles.svg', component: 'Roles.tsx', name: 'SvgRoles' },
  { svg: 'RuleBook.svg', component: 'RuleBook.tsx', name: 'SvgRuleBook' },
  { svg: 'PhoneBookl.svg', component: 'PhoneBook.tsx', name: 'SvgPhoneBook' },
  { svg: 'BetterTownSquare.svg', component: 'TownSquare.tsx', name: 'SvgTownSquare' },
  { svg: 'config.svg', component: 'Config.tsx', name: 'SvgConfig' },
  { svg: 'home.svg', component: 'Home.tsx', name: 'SvgHome' },
];

console.log('SVG ViewBox Fitter');
console.log('===================\n');

let success = 0, failed = 0;

for (const { svg, component, name } of files) {
  const svgPath = path.join(svgDir, svg);
  const outputPath = path.join(outputDir, component);
  
  if (!fs.existsSync(svgPath)) {
    console.log(`❌ ${svg} - not found`);
    failed++;
    continue;
  }
  
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const pathMatch = svgContent.match(/d="([^"]+)"/);
  
  if (!pathMatch) {
    console.log(`❌ ${svg} - no path data`);
    failed++;
    continue;
  }
  
  const originalPath = pathMatch[1];
  
  try {
    const bounds = getPathBounds(originalPath);
    
    // Add 5% padding
    const padding = Math.max(bounds.width, bounds.height) * 0.05;
    const viewBoxMinX = bounds.minX - padding;
    const viewBoxMinY = bounds.minY - padding;
    const viewBoxWidth = bounds.width + padding * 2;
    const viewBoxHeight = bounds.height + padding * 2;
    
    const viewBox = `${viewBoxMinX.toFixed(2)} ${viewBoxMinY.toFixed(2)} ${viewBoxWidth.toFixed(2)} ${viewBoxHeight.toFixed(2)}`;
    
    console.log(`\n📄 ${svg}`);
    console.log(`   Original bounds: [${bounds.minX.toFixed(1)}, ${bounds.minY.toFixed(1)}] to [${bounds.maxX.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
    console.log(`   Size: ${bounds.width.toFixed(1)} x ${bounds.height.toFixed(1)}`);
    console.log(`   New viewBox: ${viewBox}`);
    
    const componentCode = generateComponent(name, viewBox, originalPath);
    fs.writeFileSync(outputPath, componentCode);
    console.log(`   ✅ ${component}`);
    success++;
  } catch (e) {
    console.log(`❌ ${svg} - Error: ${e.message}`);
    failed++;
  }
}

console.log('\n===================');
console.log(`Success: ${success}, Failed: ${failed}`);
console.log('Run: npx tsc --noEmit');
