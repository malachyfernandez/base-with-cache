#!/usr/bin/env node
/**
 * SVG Path Rescaler Tool v3
 * Properly handles SVG compact notation including -.316 style numbers
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse SVG path data with proper handling of compact notation
 */
function parsePathData(d) {
    // Step 1: Insert space between number and letter (except e in scientific notation)
    // e.g., "c-9.068-.316" -> "c -9.068 -.316"
    let normalized = d
        .replace(/([0-9])([A-Za-z])/g, '$1 $2')   // number followed by command
        .replace(/([A-Za-z])([0-9-])/g, '$1 $2')  // command followed by number/minus
        .replace(/([0-9])-/g, '$1 -')            // number followed by minus
        .replace(/e-/g, 'e-');                    // keep scientific notation intact
    
    // Step 2: Fix standalone minus signs (e.g., "-.316" -> "-0.316")
    normalized = normalized.replace(/(\s|^)-\.(\d+)/g, '$1-0.$2');
    
    // Step 3: Split into tokens
    const tokens = normalized.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/g) || [];
    
    const points = [];
    let currentX = 0, currentY = 0;
    let startX = 0, startY = 0;
    let lastCmd = '';
    
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        
        // Check if it's a command
        if (/[MmLlHhVvCcSsQqTtAaZz]/.test(token)) {
            lastCmd = token;
            i++;
            continue;
        }
        
        // It's a number
        const num = parseFloat(token);
        if (isNaN(num)) {
            i++;
            continue;
        }
        
        const cmd = lastCmd.toLowerCase();
        const isRelative = lastCmd === lastCmd.toLowerCase();
        
        let x, y, usedTokens = 1;
        
        switch (cmd) {
            case 'm': // move to (x, y)
                if (i + 1 < tokens.length) {
                    x = num;
                    y = parseFloat(tokens[i + 1]);
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x; currentY = y;
                    startX = x; startY = y;
                    usedTokens = 2;
                    // Subsequent pairs are treated as lineto
                    lastCmd = isRelative ? 'l' : 'L';
                }
                break;
                
            case 'l': // line to (x, y)
                if (i + 1 < tokens.length) {
                    x = num;
                    y = parseFloat(tokens[i + 1]);
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x; currentY = y;
                    usedTokens = 2;
                }
                break;
                
            case 'h': // horizontal line (x)
                x = num;
                y = currentY;
                if (isRelative) x += currentX;
                points.push({ x, y });
                currentX = x;
                break;
                
            case 'v': // vertical line (y)
                x = currentX;
                y = num;
                if (isRelative) y += currentY;
                points.push({ x, y });
                currentY = y;
                break;
                
            case 'c': // cubic bezier (cp1x, cp1y, cp2x, cp2y, x, y)
                if (i + 5 < tokens.length) {
                    const cp1x = num;
                    const cp1y = parseFloat(tokens[i + 1]);
                    const cp2x = parseFloat(tokens[i + 2]);
                    const cp2y = parseFloat(tokens[i + 3]);
                    x = parseFloat(tokens[i + 4]);
                    y = parseFloat(tokens[i + 5]);
                    
                    if (isRelative) {
                        points.push({ x: currentX + cp1x, y: currentY + cp1y });
                        points.push({ x: currentX + cp2x, y: currentY + cp2y });
                        currentX += x; currentY += y;
                    } else {
                        points.push({ x: cp1x, y: cp1y });
                        points.push({ x: cp2x, y: cp2y });
                        currentX = x; currentY = y;
                    }
                    points.push({ x: currentX, y: currentY });
                    usedTokens = 6;
                }
                break;
                
            case 's': // smooth cubic (cp2x, cp2y, x, y)
                if (i + 3 < tokens.length) {
                    const cp2x = num;
                    const cp2y = parseFloat(tokens[i + 1]);
                    x = parseFloat(tokens[i + 2]);
                    y = parseFloat(tokens[i + 3]);
                    
                    if (isRelative) {
                        points.push({ x: currentX + cp2x, y: currentY + cp2y });
                        currentX += x; currentY += y;
                    } else {
                        points.push({ x: cp2x, y: cp2y });
                        currentX = x; currentY = y;
                    }
                    points.push({ x: currentX, y: currentY });
                    usedTokens = 4;
                }
                break;
                
            case 'q': // quadratic bezier (cpx, cpy, x, y)
                if (i + 3 < tokens.length) {
                    const cpx = num;
                    const cpy = parseFloat(tokens[i + 1]);
                    x = parseFloat(tokens[i + 2]);
                    y = parseFloat(tokens[i + 3]);
                    
                    if (isRelative) {
                        points.push({ x: currentX + cpx, y: currentY + cpy });
                        currentX += x; currentY += y;
                    } else {
                        points.push({ x: cpx, y: cpy });
                        currentX = x; currentY = y;
                    }
                    points.push({ x: currentX, y: currentY });
                    usedTokens = 4;
                }
                break;
                
            case 't': // smooth quadratic (x, y)
                if (i + 1 < tokens.length) {
                    x = num;
                    y = parseFloat(tokens[i + 1]);
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x; currentY = y;
                    usedTokens = 2;
                }
                break;
                
            case 'a': // arc (rx, ry, rot, large, sweep, x, y)
                if (i + 6 < tokens.length) {
                    // Skip rx, ry, rot, large, sweep
                    x = parseFloat(tokens[i + 5]);
                    y = parseFloat(tokens[i + 6]);
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x; currentY = y;
                    usedTokens = 7;
                }
                break;
                
            case 'z':
                currentX = startX;
                currentY = startY;
                break;
        }
        
        i += usedTokens;
    }
    
    return points;
}

function getBoundingBox(points) {
    if (points.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const p of points) {
        if (!isNaN(p.x) && !isNaN(p.y)) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
    }
    
    return {
        minX, minY, maxX, maxY,
        width: maxX - minX,
        height: maxY - minY
    };
}

function transformPath(d, targetSize = 100, padding = 0.1) {
    const points = parsePathData(d);
    const bounds = getBoundingBox(points);
    
    console.log(`  Bounds: [${bounds.minX.toFixed(2)}, ${bounds.minY.toFixed(2)}] to [${bounds.maxX.toFixed(2)}, ${bounds.maxY.toFixed(2)}]`);
    console.log(`  Size: ${bounds.width.toFixed(2)} x ${bounds.height.toFixed(2)}`);
    
    if (bounds.width === 0 || bounds.height === 0 || !isFinite(bounds.width) || !isFinite(bounds.height)) {
        console.log(`  ⚠️ Invalid bounds, returning original`);
        return d;
    }
    
    // Calculate scale and offset
    const availableSize = targetSize * (1 - padding * 2);
    const scale = Math.min(availableSize / bounds.width, availableSize / bounds.height);
    
    const scaledWidth = bounds.width * scale;
    const scaledHeight = bounds.height * scale;
    const offsetX = (targetSize - scaledWidth) / 2;
    const offsetY = (targetSize - scaledHeight) / 2;
    
    console.log(`  Scale: ${scale.toFixed(4)}, Offset: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)})`);
    
    // Transform function
    const tx = (v) => ((v - bounds.minX) * scale + offsetX).toFixed(2);
    const ty = (v) => ((v - bounds.minY) * scale + offsetY).toFixed(2);
    
    // Rebuild path
    let normalized = d
        .replace(/([0-9])([A-Za-z])/g, '$1 $2')
        .replace(/([A-Za-z])([0-9-])/g, '$1 $2')
        .replace(/([0-9])-/g, '$1 -')
        .replace(/e-/g, 'e-');
    
    normalized = normalized.replace(/(\s|^)-\.(\d+)/g, '$1-0.$2');
    
    const tokens = normalized.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/g) || [];
    
    let result = '';
    let i = 0;
    let lastCmd = '';
    
    while (i < tokens.length) {
        const token = tokens[i];
        
        if (/[MmLlHhVvCcSsQqTtAaZz]/.test(token)) {
            result += token;
            lastCmd = token.toLowerCase();
            i++;
            continue;
        }
        
        const num = parseFloat(token);
        if (isNaN(num)) {
            i++;
            continue;
        }
        
        const cmd = lastCmd;
        let used = 1;
        
        switch (cmd) {
            case 'm':
            case 'l':
                if (i + 1 < tokens.length) {
                    result += `${tx(num)},${ty(parseFloat(tokens[i + 1]))} `;
                    used = 2;
                }
                break;
            case 'h':
                result += `${tx(num)} `;
                break;
            case 'v':
                result += `${ty(num)} `;
                break;
            case 'c':
                if (i + 5 < tokens.length) {
                    result += `${tx(num)},${ty(parseFloat(tokens[i + 1]))} `;
                    result += `${tx(parseFloat(tokens[i + 2]))},${ty(parseFloat(tokens[i + 3]))} `;
                    result += `${tx(parseFloat(tokens[i + 4]))},${ty(parseFloat(tokens[i + 5]))} `;
                    used = 6;
                }
                break;
            case 's':
                if (i + 3 < tokens.length) {
                    result += `${tx(num)},${ty(parseFloat(tokens[i + 1]))} `;
                    result += `${tx(parseFloat(tokens[i + 2]))},${ty(parseFloat(tokens[i + 3]))} `;
                    used = 4;
                }
                break;
            case 'q':
                if (i + 3 < tokens.length) {
                    result += `${tx(num)},${ty(parseFloat(tokens[i + 1]))} `;
                    result += `${tx(parseFloat(tokens[i + 2]))},${ty(parseFloat(tokens[i + 3]))} `;
                    used = 4;
                }
                break;
            case 't':
                if (i + 1 < tokens.length) {
                    result += `${tx(num)},${ty(parseFloat(tokens[i + 1]))} `;
                    used = 2;
                }
                break;
            case 'a':
                if (i + 6 < tokens.length) {
                    result += `${num},${parseFloat(tokens[i + 1])} ${parseFloat(tokens[i + 2])} ${parseFloat(tokens[i + 3])} ${parseFloat(tokens[i + 4])} `;
                    result += `${tx(parseFloat(tokens[i + 5]))},${ty(parseFloat(tokens[i + 6]))} `;
                    used = 7;
                }
                break;
            default:
                result += `${num} `;
        }
        
        i += used;
    }
    
    return result.trim();
}

function generateComponent(name, pathData) {
    return `import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";

interface IconProps extends SvgProps {
  color?: string;
  strokeWidth?: number;
}

const ${name} = ({ color = "#000", strokeWidth = 0, ...props }: IconProps) => (
  <Svg viewBox="0 0 100 100" {...props}>
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

console.log('SVG Rescaler Tool v3');
console.log('====================\n');

let success = 0, failed = 0;

for (const { svg, component, name } of files) {
  const svgPath = path.join(svgDir, svg);
  const outputPath = path.join(outputDir, component);
  
  if (!fs.existsSync(svgPath)) {
    console.log(`❌ ${svg} - not found`);
    failed++;
    continue;
  }
  
  console.log(`\n📄 ${svg}`);
  
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const pathMatch = svgContent.match(/d="([^"]+)"/);
  
  if (!pathMatch) {
    console.log(`   ❌ No path data`);
    failed++;
    continue;
  }
  
  try {
    const transformed = transformPath(pathMatch[1]);
    const componentCode = generateComponent(name, transformed);
    fs.writeFileSync(outputPath, componentCode);
    console.log(`   ✅ ${component}`);
    success++;
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    failed++;
  }
}

console.log('\n====================');
console.log(`Success: ${success}, Failed: ${failed}`);
console.log('Run: npx tsc --noEmit');
