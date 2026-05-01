const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/layout/FloatingDock.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add isMobile prop to DockItem
content = content.replace(
    /compact\?\: boolean;\s+mouseX\: any;\s+\}\) => \{/g,
    'compact?: boolean;\n    mouseX: any;\n    isMobile?: boolean;\n}) => {'
);

// Fix 2: Add isCompactActive logic
content = content.replace(
    /const isCompactProfileDock = isClientProfile && isMobile;\s+(const previewNavItems:)/g,
    'const isCompactProfileDock = isClientProfile && isMobile;\n    const isCompactActive = isMobile || isCompactProfileDock;\n\n    $1'
);

// Fix 3: Implement isCompactActive in dockContent className and style
content = content.replace(
    /className=\{\`fixed left-1\/2 -translate-x-1\/2 bottom-8 z-\[99990\] \$\{isCompactProfileDock \? "w-\[calc\(100vw-32px\)\] max-w-\[380px\]" : ""\}\`\}\s+style=\{\{ bottom: isCompactProfileDock \? "calc\(env\(safe-area-inset-bottom, 0px\) \+ 16px\)" : undefined \}\}\s+>/g,
    'className={`fixed left-1/2 -translate-x-1/2 bottom-8 z-[99990] ${isCompactActive ? "w-[calc(100vw-32px)] max-w-[380px]" : ""}`}\n            style={{ bottom: isCompactActive ? "calc(env(safe-area-inset-bottom, 0px) + 16px)" : undefined }}\n        >'
);

// Fix 4: Add AnimatePresence and motion.div around dockContent
content = content.replace(
    /const dockContent = \(\s+<div\s+ref=\{dockRef\}\s+className=/g,
    'const dockContent = (\n        <AnimatePresence>\n            {isVisible && (\n                <motion.div\n                    initial={{ y: 150, opacity: 0 }}\n                    animate={{ y: 0, opacity: 1 }}\n                    exit={{ y: 150, opacity: 0 }}\n                    transition={{ type: "spring", stiffness: 300, damping: 30 }}\n                    ref={dockRef}\n                    className='
);

// Fix 5: Close AnimatePresence and motion.div
content = content.replace(
    /                    \s*<\/>\s+\)\}\s+<\/motion\.div>\s+<\/div>\s+\);/g,
    '                    </>\n                )}\n            </motion.div>\n        </motion.div>\n        )}\n        </AnimatePresence>\n    );'
);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched FloatingDock.tsx');
