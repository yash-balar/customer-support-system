import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "./api/QueryClientProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { RouteList } from "./routes";
import "./styles.css";

function App() {
  return (
    <QueryClientProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <RouteList />
          </BrowserRouter>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
export default App;
