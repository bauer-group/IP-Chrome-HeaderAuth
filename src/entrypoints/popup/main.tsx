import { createRoot } from 'react-dom/client';
import { PopupApp } from '../../components/popup/PopupApp';
import '../../assets/tailwind.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<PopupApp />);
