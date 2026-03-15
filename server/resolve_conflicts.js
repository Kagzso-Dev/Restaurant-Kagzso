const fs = require('fs');
const path = require('path');

function resolveFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('<<<<<<<')) return;

    console.log(`Resolving conflicts in ${filePath}...`);
    
    // Pattern to match conflict blocks and keep the HEAD side
    // This assumes the format is:
    // <<<<<<< HEAD
    // [KEEP THIS]
    // =======
    // [DISCARD THIS]
    // >>>>>>> [ID]
    
    const lines = content.split(/\r?\n/);
    const result = [];
    let state = 'normal'; // normal, head, discard

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('<<<<<<<')) {
            state = 'head';
        } else if (line.startsWith('=======')) {
            state = 'discard';
        } else if (line.startsWith('>>>>>>>')) {
            state = 'normal';
        } else {
            if (state === 'normal' || state === 'head') {
                result.push(line);
            }
        }
    }

    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                walk(fullPath);
            }
        } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.env') || file.endsWith('.example')) {
            resolveFile(fullPath);
        }
    }
}

walk(process.cwd());
console.log('Done.');
