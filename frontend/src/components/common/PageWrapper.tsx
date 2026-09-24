import { motion } from 'framer-motion';
import React from 'react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.22,
  ease: 'easeInOut' as const,
};

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrap every page root element with this component to get smooth route transitions.
 * Usage: <PageWrapper><YourPage /></PageWrapper>
 */
export const PageWrapper: React.FC<PageWrapperProps> = ({ children, className }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    style={{ willChange: 'opacity, transform' }}
    className={className}
  >
    {children}
  </motion.div>
);
