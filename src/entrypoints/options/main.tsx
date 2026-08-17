import { createRoot } from 'react-dom/client';
import { OptionsApp } from '../../components/options/OptionsApp';
import '../../assets/tailwind.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<OptionsApp />);
