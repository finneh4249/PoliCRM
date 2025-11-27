import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
    return (
        <div className="flex min-h-screen bg-slate-100">
            <Sidebar />
            <div className="flex-1 ml-64 transition-all duration-300">
                <Outlet />
            </div>
        </div>
    );
}
