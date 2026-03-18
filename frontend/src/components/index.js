/**
 * ExamEdge Component Exports
 * Central index for all reusable components
 */

// ============================================================================
// UI COMPONENTS (Generic, reusable across the app)
// ============================================================================
export { Button } from './ui/Button';
export { Card, CardHeader, CardBody, CardFooter } from './ui/Card';
export { Badge } from './ui/Badge';
export { Alert } from './ui/Alert';
export { Modal } from './ui/Modal';
export { Navbar } from './ui/Navbar';
export { Sidebar } from './ui/Sidebar';

// ============================================================================
// EXAM COMPONENTS (JEE Exam Interface)
// ============================================================================
export { ExamInterfaceJEE } from './exam/ExamInterfaceJEE';
export { ExamHeaderJEE } from './exam/ExamHeaderJEE';
export { QuestionPalette } from './exam/QuestionPalette';
export { QuestionPaletteButton } from './exam/QuestionPaletteButton';

// ============================================================================
// EXAM COMPONENTS (MHT-CET Exam Interface)
// ============================================================================
export { ExamInterfaceMHTCET } from './exam/ExamInterfaceMHTCET';
export { ExamHeaderMHTCET } from './exam/ExamHeaderMHTCET';

// ============================================================================
// SHARED EXAM COMPONENTS
// ============================================================================
export { QuestionCard } from './exam/QuestionCard';
export { OptionButton } from './exam/OptionButton';
export { ExamFooter } from './exam/ExamFooter';

// ============================================================================
// DASHBOARD COMPONENTS
// ============================================================================
export { StatCard } from './dashboard/StatCard';
export { TestCard } from './dashboard/TestCard';

// ============================================================================
// PAGE COMPONENTS
// ============================================================================
export { LoginPageStyled } from './pages/LoginPageStyled';
export { RegisterPageStyled } from './pages/RegisterPageStyled';
export { DashboardPageStyled } from './pages/DashboardPageStyled';
export { AnalyticsPageStyled } from './pages/AnalyticsPageStyled';
export { ResultsPage } from './pages/ResultsPage';
