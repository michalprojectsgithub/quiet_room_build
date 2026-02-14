import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Add CSS animations for modal
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes modalSlideIn {
    from { 
      opacity: 0;
      transform: scale(0.95) translateY(20px);
    }
    to { 
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
