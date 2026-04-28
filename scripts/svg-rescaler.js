#!/usr/bin/env node
/**
 * SVG Path Rescaler Tool
 * 
 * This tool analyzes SVG path data to find the bounding box,
 * then transforms the coordinates to center and scale the icon
 * within a target viewBox.
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse SVG path commands and extract all coordinate points
 */
function parsePathPoints(d) {
    const points = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    
    // Tokenize path: split by command letters
    const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    
    for (const token of tokens) {
        const cmd = token[0];
        const isRelative = cmd === cmd.toLowerCase() && cmd !== 'M' && cmd !== 'm';
        const args = token.slice(1).trim().split(/[\s,]+/).filter(s => s).map(parseFloat);
        
        let i = 0;
        while (i < args.length) {
            let x, y;
            
            switch (cmd.toLowerCase()) {
                case 'm': // move
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) {
                        x += currentX;
                        y += currentY;
                    }
                    points.push({ x, y });
                    currentX = x;
                    currentY = y;
                    startX = x;
                    startY = y;
                    break;
                    
                case 'l': // line
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) {
                        x += currentX;
                        y += currentY;
                    }
                    points.push({ x, y });
                    currentX = x;
                    currentY = y;
                    break;
                    
                case 'h': // horizontal line
                    x = args[i++];
                    y = currentY;
                    if (isRelative) {
                        x += currentX;
                    }
                    points.push({ x, y });
                    currentX = x;
                    break;
                    
                case 'v': // vertical line
                    y = args[i++];
                    x = currentX;
                    if (isRelative) {
                        y += currentY;
                    }
                    points.push({ x, y });
                    currentY = y;
                    break;
                    
                case 'c': // cubic bezier
                    // Control point 1
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    // Control point 2
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    // End point
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x;
                    currentY = y;
                    break;
                    
                case 's': // smooth cubic
                    // Control point 2
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    // End point
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x;
                    currentY = y;
                    break;
                    
                case 'q': // quadratic bezier
                    // Control point
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    // End point
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x;
                    currentY = y;
                    break;
                    
                case 't': // smooth quadratic
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x;
                    currentY = y;
                    break;
                    
                case 'a': // arc
                    // rx, ry, rotation, large-arc, sweep
                    i += 5;
                    // End point
                    x = args[i++];
                    y = args[i++];
                    if (isRelative) { x += currentX; y += currentY; }
                    points.push({ x, y });
                    currentX = x;
                    currentY = y;
                    break;
                    
                case 'z':
                    currentX = startX;
                    currentY = startY;
                    break;
                    
                default:
                    i++;
            }
        }
    }
    
    return points;
}

/**
 * Calculate bounding box from points
 */
function getBoundingBox(points) {
    if (points.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Transform path data to fit target viewBox with centering and padding
 */
function transformPath(d, targetViewBox, padding = 0.1) {
    // Parse all points to find bounds
    const points = parsePathPoints(d);
    const bounds = getBoundingBox(points);
    
    console.log(`  Original bounds: x=[${bounds.minX.toFixed(2)}, ${bounds.maxX.toFixed(2)}], y=[${bounds.minY.toFixed(2)}, ${bounds.maxY.toFixed(2)}]`);
    console.log(`  Size: ${bounds.width.toFixed(2)} x ${bounds.height.toFixed(2)}`);
    
    // Calculate scale to fit with padding
    const paddedWidth = targetViewBox.width * (1 - padding * 2);
    const paddedHeight = targetViewBox.height * (1 - padding * 2);
    const scaleX = paddedWidth / bounds.width;
    const scaleY = paddedHeight / bounds.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate centered offset
    const scaledWidth = bounds.width * scale;
    const scaledHeight = bounds.height * scale;
    const offsetX = (targetViewBox.width - scaledWidth) / 2;
    const offsetY = (targetViewBox.height - scaledHeight) / 2;
    
    console.log(`  Scale: ${scale.toFixed(4)}`);
    console.log(`  Offset: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)})`);
    
    // Transform coordinates in path
    let result = '';
    let i = 0;
    
    // Re-parse and transform
    const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    
    for (const token of tokens) {
        const cmd = token[0];
        const isRelative = cmd === cmd.toLowerCase() && cmd !== 'M' && cmd !== 'm';
        const args = token.slice(1).trim().split(/[\s,]+/).filter(s => s);
        
        result += cmd;
        
        let idx = 0;
        while (idx < args.length) {
            const num = parseFloat(args[idx]);
            
            switch (cmd.toLowerCase()) {
                case 'm':
                case 'l':
                    if (idx + 1 < args.length) {
                        let x = parseFloat(args[idx]);
                        let y = parseFloat(args[idx + 1]);
                        // Transform: (val - min) * scale + offset
                        if (!isRelative) {
                            x = (x - bounds.minX) * scale + offsetX;
                            y = (y - bounds.minY) * scale + offsetY;
                        }
                        result += `${x.toFixed(3)},${y.toFixed(3)} `;
                        idx += 2;
                    } else {
                        idx++;
                    }
                    break;
                    
                case 'h':
                    let hx = parseFloat(args[idx]);
                    if (!isRelative) {
                        hx = (hx - bounds.minX) * scale + offsetX;
                    }
                    result += `${hx.toFixed(3)} `;
                    idx++;
                    break;
                    
                case 'v':
                    let vy = parseFloat(args[idx]);
                    if (!isRelative) {
                        vy = (vy - bounds.minY) * scale + offsetY;
                    }
                    result += `${vy.toFixed(3)} `;
                    idx++;
                    break;
                    
                case 'c':
                    if (idx + 5 < args.length) {
                        const c1x = (parseFloat(args[idx]) - bounds.minX) * scale + offsetX;
                        const c1y = (parseFloat(args[idx + 1]) - bounds.minY) * scale + offsetY;
                        const c2x = (parseFloat(args[idx + 2]) - bounds.minX) * scale + offsetX;
                        const c2y = (parseFloat(args[idx + 3]) - bounds.minY) * scale + offsetY;
                        const ex = (parseFloat(args[idx + 4]) - bounds.minX) * scale + offsetX;
                        const ey = (parseFloat(args[idx + 5]) - bounds.minY) * scale + offsetY;
                        result += `${c1x.toFixed(3)},${c1y.toFixed(3)} ${c2x.toFixed(3)},${c2y.toFixed(3)} ${ex.toFixed(3)},${ey.toFixed(3)} `;
                        idx += 6;
                    } else {
                        idx++;
                    }
                    break;
                    
                case 's':
                    if (idx + 3 < args.length) {
                        const sc2x = (parseFloat(args[idx]) - bounds.minX) * scale + offsetX;
                        const sc2y = (parseFloat(args[idx + 1]) - bounds.minY) * scale + offsetY;
                        const sex = (parseFloat(args[idx + 2]) - bounds.minX) * scale + offsetX;
                        const sey = (parseFloat(args[idx + 3]) - bounds.minY) * scale + offsetY;
                        result += `${sc2x.toFixed(3)},${sc2y.toFixed(3)} ${sex.toFixed(3)},${sey.toFixed(3)} `;
                        idx += 4;
                    } else {
                        idx++;
                    }
                    break;
                    
                case 'q':
                    if (idx + 3 < args.length) {
                        const qcx = (parseFloat(args[idx]) - bounds.minX) * scale + offsetX;
                        const qcy = (parseFloat(args[idx + 1]) - bounds.minY) * scale + offsetY;
                        const qex = (parseFloat(args[idx + 2]) - bounds.minX) * scale + offsetX;
                        const qey = (parseFloat(args[idx + 3]) - bounds.minY) * scale + offsetY;
                        result += `${qcx.toFixed(3)},${qcy.toFixed(3)} ${qex.toFixed(3)},${qey.toFixed(3)} `;
                        idx += 4;
                    } else {
                        idx++;
                    }
                    break;
                    
                case 'a':
                    if (idx + 6 < args.length) {
                        const arx = parseFloat(args[idx]);
                        const ary = parseFloat(args[idx + 1]);
                        const arot = parseFloat(args[idx + 2]);
                        const alarge = parseFloat(args[idx + 3]);
                        const asweep = parseFloat(args[idx + 4]);
                        const aex = (parseFloat(args[idx + 5]) - bounds.minX) * scale + offsetX;
                        const aey = (parseFloat(args[idx + 6]) - bounds.minY) * scale + offsetY;
                        result += `${arx.toFixed(3)},${ary.toFixed(3)} ${arot} ${alarge} ${asweep} ${aex.toFixed(3)},${aey.toFixed(3)} `;
                        idx += 7;
                    } else {
                        idx++;
                    }
                    break;
                    
                default:
                    result += `${num} `;
                    idx++;
            }
        }
    }
    
    return result.trim();
}

/**
 * Generate React Native SVG component
 */
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

// Main execution
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

console.log('SVG Rescaler Tool');
console.log('=================\n');
console.log(`Source: ${svgDir}`);
console.log(`Output: ${outputDir}\n`);

const targetViewBox = { x: 0, y: 0, width: 100, height: 100 };

for (const { svg, component, name } of files) {
  const svgPath = path.join(svgDir, svg);
  const outputPath = path.join(outputDir, component);
  
  if (!fs.existsSync(svgPath)) {
    console.log(`❌ Skipping ${svg} - not found`);
    continue;
  }
  
  console.log(`\nProcessing ${svg}...`);
  
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const pathMatch = svgContent.match(/d="([^"]+)"/);
  
  if (!pathMatch) {
    console.log(`  ❌ No path data found`);
    continue;
  }
  
  const originalPath = pathMatch[1];
  const transformedPath = transformPath(originalPath, targetViewBox, 0.1);
  
  const componentCode = generateComponent(
    name,
    `${targetViewBox.x} ${targetViewBox.y} ${targetViewBox.width} ${targetViewBox.height}`,
    transformedPath
  );
  
  fs.writeFileSync(outputPath, componentCode);
  console.log(`  ✅ Created ${component}`);
}

console.log('\n=================');
console.log('Done! Run `npx tsc --noEmit` to verify.');
