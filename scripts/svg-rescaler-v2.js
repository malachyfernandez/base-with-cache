#!/usr/bin/env node
/**
 * SVG Path Rescaler Tool v2
 * Properly parses SVG path data with compact notation (e.g., -9.068-.316)
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse SVG path data into command sequence
 * Handles compact notation where -9.068-.316 means -9.068, -0.316
 */
function parsePath(d) {
    const commands = [];
    // Insert space before minus signs that are not at the start
    // This transforms "c-9.068-.316-18.135" into "c -9.068 -0.316 -18.135"
    const normalized = d.replace(/([0-9.])(-)/g, '$1 $2');
    
    // Split by command letters
    const tokens = normalized.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    
    let currentX = 0, currentY = 0;
    let startX = 0, startY = 0;
    
    for (const token of tokens) {
        const cmd = token[0];
        const isLower = cmd === cmd.toLowerCase();
        const data = token.slice(1).trim();
        
        // Parse numbers - handle comma and space separation
        const nums = data.split(/[\s,]+/).filter(s => s.length > 0).map(parseFloat);
        
        let i = 0;
        while (i < nums.length) {
            const point = { x: null, y: null, cmd };
            
            switch (cmd.toLowerCase()) {
                case 'm': // move to
                    if (i + 1 < nums.length) {
                        let x = nums[i++];
                        let y = nums[i++];
                        if (isLower && commands.length > 0) {
                            x += currentX;
                            y += currentY;
                        }
                        point.x = x; point.y = y;
                        currentX = x; currentY = y;
                        startX = x; startY = y;
                        commands.push(point);
                    }
                    break;
                    
                case 'l': // line to
                    if (i + 1 < nums.length) {
                        let x = nums[i++];
                        let y = nums[i++];
                        if (isLower) { x += currentX; y += currentY; }
                        point.x = x; point.y = y;
                        currentX = x; currentY = y;
                        commands.push(point);
                    }
                    break;
                    
                case 'h': // horizontal line
                    if (i < nums.length) {
                        let x = nums[i++];
                        let y = currentY;
                        if (isLower) x += currentX;
                        point.x = x; point.y = y;
                        currentX = x;
                        commands.push(point);
                    }
                    break;
                    
                case 'v': // vertical line
                    if (i < nums.length) {
                        let y = nums[i++];
                        let x = currentX;
                        if (isLower) y += currentY;
                        point.x = x; point.y = y;
                        currentY = y;
                        commands.push(point);
                    }
                    break;
                    
                case 'c': // cubic bezier (6 params: cp1x, cp1y, cp2x, cp2y, x, y)
                    if (i + 5 < nums.length) {
                        // Control point 1
                        let cp1x = nums[i++];
                        let cp1y = nums[i++];
                        // Control point 2
                        let cp2x = nums[i++];
                        let cp2y = nums[i++];
                        // End point
                        let x = nums[i++];
                        let y = nums[i++];
                        
                        if (isLower) {
                            cp1x += currentX; cp1y += currentY;
                            cp2x += currentX; cp2y += currentY;
                            x += currentX; y += currentY;
                        }
                        
                        // Add all 3 points for bounds calculation
                        commands.push({ x: cp1x, y: cp1y, cmd });
                        commands.push({ x: cp2x, y: cp2y, cmd });
                        point.x = x; point.y = y;
                        currentX = x; currentY = y;
                        commands.push(point);
                    }
                    break;
                    
                case 's': // smooth cubic (4 params: cp2x, cp2y, x, y)
                    if (i + 3 < nums.length) {
                        let cp2x = nums[i++];
                        let cp2y = nums[i++];
                        let x = nums[i++];
                        let y = nums[i++];
                        
                        if (isLower) {
                            cp2x += currentX; cp2y += currentY;
                            x += currentX; y += currentY;
                        }
                        
                        commands.push({ x: cp2x, y: cp2y, cmd });
                        point.x = x; point.y = y;
                        currentX = x; currentY = y;
                        commands.push(point);
                    }
                    break;
                    
                case 'q': // quadratic bezier (4 params: cpx, cpy, x, y)
                    if (i + 3 < nums.length) {
                        let cpx = nums[i++];
                        let cpy = nums[i++];
                        let x = nums[i++];
                        let y = nums[i++];
                        
                        if (isLower) {
                            cpx += currentX; cpy += currentY;
                            x += currentX; y += currentY;
                        }
                        
                        commands.push({ x: cpx, y: cpy, cmd });
                        point.x = x; point.y = y;
                        currentX = x; currentY = y;
                        commands.push(point);
                    }
                    break;
                    
                case 't': // smooth quadratic (2 params: x, y)
                    if (i + 1 < nums.length) {
                        let x = nums[i++];
                        let y = nums[i++];
                        if (isLower) { x += currentX; y += currentY; }
                        point.x = x; point.y = y;
                        currentX = x; currentY = y;
                        commands.push(point);
                    }
                    break;
                    
                case 'a': // arc (7 params: rx, ry, rot, large, sweep, x, y)
                    if (i + 6 < nums.length) {
                        let rx = nums[i++];
                        let ry = nums[i++];
                        let rot = nums[i++];
                        let large = nums[i++];
                        let sweep = nums[i++];
                        let x = nums[i++];
                        let y = nums[i++];
                        
                        if (isLower) { x += currentX; y += currentY; }
                        point.x = x; point.y = y;
                        currentX = x; currentY = y;
                        commands.push(point);
                    }
                    break;
                    
                case 'z':
                    currentX = startX;
                    currentY = startY;
                    commands.push({ x: currentX, y: currentY, cmd });
                    break;
                    
                default:
                    i++;
            }
        }
    }
    
    return commands.filter(c => c.x !== null && c.y !== null && !isNaN(c.x) && !isNaN(c.y));
}

function getBoundingBox(commands) {
    if (commands.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const c of commands) {
        if (!isNaN(c.x) && !isNaN(c.y)) {
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x);
            maxY = Math.max(maxY, c.y);
        }
    }
    
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function transformPath(d, targetViewBox) {
    const commands = parsePath(d);
    const bounds = getBoundingBox(commands);
    
    console.log(`  Bounds: [${bounds.minX.toFixed(2)}, ${bounds.minY.toFixed(2)}] to [${bounds.maxX.toFixed(2)}, ${bounds.maxY.toFixed(2)}]`);
    console.log(`  Size: ${bounds.width.toFixed(2)} x ${bounds.height.toFixed(2)}`);
    
    if (bounds.width === 0 || bounds.height === 0) {
        console.log(`  ⚠️ Zero size bounds, returning original`);
        return d;
    }
    
    // Calculate scale to fit with 10% padding
    const padding = 0.1;
    const availableWidth = targetViewBox.width * (1 - padding * 2);
    const availableHeight = targetViewBox.height * (1 - padding * 2);
    const scale = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
    
    // Calculate offset to center
    const scaledWidth = bounds.width * scale;
    const scaledHeight = bounds.height * scale;
    const offsetX = (targetViewBox.width - scaledWidth) / 2;
    const offsetY = (targetViewBox.height - scaledHeight) / 2;
    
    console.log(`  Scale: ${scale.toFixed(4)}`);
    console.log(`  Center offset: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)})`);
    
    // Transform: (val - min) * scale + offset
    function tx(val) {
        return ((val - bounds.minX) * scale + offsetX).toFixed(3);
    }
    function ty(val) {
        return ((val - bounds.minY) * scale + offsetY).toFixed(3);
    }
    
    // Rebuild path with transformed coordinates
    // Insert spaces before negative numbers for proper parsing
    const normalized = d.replace(/([0-9.])(-)/g, '$1 $2');
    const tokens = normalized.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    
    let result = '';
    
    for (const token of tokens) {
        const cmd = token[0];
        const isLower = cmd === cmd.toLowerCase();
        const data = token.slice(1).trim();
        const nums = data.split(/[\s,]+/).filter(s => s.length > 0).map(parseFloat);
        
        result += cmd;
        
        let i = 0;
        while (i < nums.length) {
            switch (cmd.toLowerCase()) {
                case 'm':
                case 'l':
                    if (i + 1 < nums.length) {
                        let x = nums[i++];
                        let y = nums[i++];
                        result += `${tx(x)},${ty(y)} `;
                    } else i++;
                    break;
                    
                case 'h':
                    if (i < nums.length) {
                        let x = nums[i++];
                        result += `${tx(x)} `;
                    } else i++;
                    break;
                    
                case 'v':
                    if (i < nums.length) {
                        let y = nums[i++];
                        result += `${ty(y)} `;
                    } else i++;
                    break;
                    
                case 'c':
                    if (i + 5 < nums.length) {
                        let cp1x = nums[i++];
                        let cp1y = nums[i++];
                        let cp2x = nums[i++];
                        let cp2y = nums[i++];
                        let x = nums[i++];
                        let y = nums[i++];
                        result += `${tx(cp1x)},${ty(cp1y)} ${tx(cp2x)},${ty(cp2y)} ${tx(x)},${ty(y)} `;
                    } else i++;
                    break;
                    
                case 's':
                    if (i + 3 < nums.length) {
                        let cp2x = nums[i++];
                        let cp2y = nums[i++];
                        let x = nums[i++];
                        let y = nums[i++];
                        result += `${tx(cp2x)},${ty(cp2y)} ${tx(x)},${ty(y)} `;
                    } else i++;
                    break;
                    
                case 'q':
                    if (i + 3 < nums.length) {
                        let cpx = nums[i++];
                        let cpy = nums[i++];
                        let x = nums[i++];
                        let y = nums[i++];
                        result += `${tx(cpx)},${ty(cpy)} ${tx(x)},${ty(y)} `;
                    } else i++;
                    break;
                    
                case 't':
                    if (i + 1 < nums.length) {
                        let x = nums[i++];
                        let y = nums[i++];
                        result += `${tx(x)},${ty(y)} `;
                    } else i++;
                    break;
                    
                case 'a':
                    if (i + 6 < nums.length) {
                        let rx = nums[i++];
                        let ry = nums[i++];
                        let rot = nums[i++];
                        let large = nums[i++];
                        let sweep = nums[i++];
                        let x = nums[i++];
                        let y = nums[i++];
                        result += `${rx.toFixed(3)},${ry.toFixed(3)} ${rot} ${large} ${sweep} ${tx(x)},${ty(y)} `;
                    } else i++;
                    break;
                    
                case 'z':
                    break;
                    
                default:
                    i++;
            }
        }
    }
    
    return result.trim();
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

const targetViewBox = { x: 0, y: 0, width: 100, height: 100 };

console.log('SVG Rescaler Tool v2');
console.log('====================\n');

for (const { svg, component, name } of files) {
  const svgPath = path.join(svgDir, svg);
  const outputPath = path.join(outputDir, component);
  
  if (!fs.existsSync(svgPath)) {
    console.log(`❌ ${svg} - not found`);
    continue;
  }
  
  console.log(`\n📄 ${svg}`);
  
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const pathMatch = svgContent.match(/d="([^"]+)"/);
  
  if (!pathMatch) {
    console.log(`   ❌ No path data`);
    continue;
  }
  
  try {
    const transformed = transformPath(pathMatch[1], targetViewBox);
    const componentCode = generateComponent(
      name,
      `${targetViewBox.x} ${targetViewBox.y} ${targetViewBox.width} ${targetViewBox.height}`,
      transformed
    );
    
    fs.writeFileSync(outputPath, componentCode);
    console.log(`   ✅ ${component}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
}

console.log('\n====================');
console.log('Done! Run: npx tsc --noEmit');
