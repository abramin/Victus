import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { ScanlineOverlay } from '../common';
import { slideInLeft, staggerContainer, fadeInUp } from '../../lib/animations';
import { SemanticFeedbackProvider } from '../../contexts/SemanticFeedbackContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SemanticFeedbackProvider>
    <div className="flex min-h-screen bg-black relative" data-testid="app-layout">
      {/* Scanline overlay - subtle ambient animation */}
      <ScanlineOverlay />

      {/* Sidebar with slide-in animation */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={slideInLeft}
        className="hidden lg:block"
      >
        <Sidebar />
      </motion.div>

      {/* Mobile sidebar (no animation to keep it snappy) */}
      <div className="lg:hidden">
        <Sidebar />
      </div>

      {/* Main content with stagger animation */}
      <motion.main
        className="flex-1 overflow-auto pb-20 lg:pb-0"
        initial="hidden"
        animate="show"
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp}>{children}</motion.div>
      </motion.main>

      <TabBar />
    </div>
    </SemanticFeedbackProvider>
  );
}
