import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src/components/layout/FloatingDock.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Inject isVisible and useScroll
content = content.replace(
    '    const [isMobile, setIsMobile] = useState(false);\r\n    const [currentClientTab, setCurrentClientTab] = useState<ProfileTabId>("home");\r\n    const dockRef = useRef<HTMLDivElement>(null);',
    `    const [isMobile, setIsMobile] = useState(false);
    const [currentClientTab, setCurrentClientTab] = useState<ProfileTabId>("home");
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const dockRef = useRef<HTMLDivElement>(null);

    const { scrollY } = useScroll();
    useMotionValueEvent(scrollY, "change", (latest) => {
        if (previewMode) return;
        const previous = lastScrollY.current;
        const diff = latest - previous;
        if (latest < 50) setIsVisible(true);
        else if (diff > 5) setIsVisible(false);
        else if (diff < -5) setIsVisible(true);
        lastScrollY.current = latest;
    });`
);

// Fix JSX syntax if it was mangled
// (Actually replacing </div> with </motion.div>)}</AnimatePresence> was done in 2039)
// But to be sure, let's make sure the end of the file is clean.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched FloatingDock.tsx state');
