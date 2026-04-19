import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  Briefcase,
  Building2,
  FolderKanban,
  CheckSquare,
  BarChart3,
  Menu,
  UserCircle, 
  PieChart, 
  LogOut,
  MessageSquare,
  Search,
  Bell,
  X,
  Send,
  User as UserIcon,
  ShieldCheck,
  Volume2,
  VolumeX,
  ArrowLeft,
  UserRoundPlus,
  Upload,
  FileCheck
} from 'lucide-react';
import EnhancedChatDrawer from './chat/EnhancedChatDrawer';
import Logo from './Logo';

interface DashboardLayoutProps {
  onLogout: () => void;
}

interface NavItem {
  name: string;
  icon: React.ComponentType<any>;
  path: string;
  hasSubmenu?: boolean;
  submenu?: { name: string; path: string; icon: React.ComponentType<any> }[];
  roles?: string[]; // Optional roles property for access control
}

const DashboardLayout: React.FC<DashboardLayoutProps> = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRealtimeChatOpen, setIsRealtimeChatOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | null>(null);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Clients', icon: Users, path: '/clients' },
    { name: 'Proposals', icon: FileCheck, path: '/proposals' },
    { name: 'Calendar View', icon: Calendar, path: '/calendar' },
    { 
      name: 'User Management', 
      icon: UserCircle, 
      path: '/users', 
      hasSubmenu: true,
      submenu: [
        { name: 'Roles', path: '/users/roles', icon: ShieldCheck },
        { name: 'Permission', path: '/users/permissions', icon: Briefcase }
      ]
    },
    { name: 'Templates', icon: FileText, path: '/templates' },
    { name: 'Time Tracking', icon: Clock, path: '/time-tracking', roles: ['Admin', 'Manager'] },
    // { name: 'Reports', icon: PieChart, path: '/reports' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(item => {
    // If no roles specified, show to everyone
    if (!item.roles || item.roles.length === 0) return true;
    // If user has roles, check if any user role matches the required roles
    return user?.roles && user.roles.length > 0 && item.roles.some(requiredRole => user.roles.includes(requiredRole));
  });

  const getPageTitle = () => {
    const current = filteredNavItems.find(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
    if (location.pathname === '/create-job') {
      return (
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mr-1 p-1 rounded hover:bg-slate-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} className="text-black hover:text-[#6366f1]" />
          </button>
          Create New Job
        </span>
      );
    }
    if (location.pathname === '/profile') return 'Profile';
    if (location.pathname === '/users/roles') return 'Roles';
    if (location.pathname === '/users/permissions') return 'Permission';
    if (location.pathname === '/time-tracking') return 'Time Tracking';
    return current ? current.name : 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-60'
        } bg-[#0f1f3d] text-gray-300 flex flex-col transition-all duration-300 ease-in-out z-20 shadow-xl border-r border-white/5`}
      >
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className={`p-5 flex items-center justify-between ${isSidebarCollapsed ? 'flex-col gap-4' : ''}`}>
            <div className="flex items-center gap-2.5">
              <Logo size="md" />
              {!isSidebarCollapsed && (
                <div className="transition-opacity duration-200">
                  <div className="font-['DM_Serif_Display'] text-[20px] text-white leading-none tracking-[-0.3px]">Practis</div>
                  <div className="text-[11px] text-[#9ca3af] font-normal mt-[2px] tracking-[0.8px]">MANAGER</div>
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1 rounded-lg bg-[#2a2d32] text-gray-400 hover:text-white hover:bg-[#363a3f] transition-all`}
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav className="mt-4 px-3 space-y-0.5">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);

              return (
                <div key={item.name} className="space-y-0.5 flex items-center">
                  {(isActive && !item.hasSubmenu) && (
                    <div className="w-[3px] h-5 bg-[#6366f1] rounded-full mr-2"></div>
                  )}
                  <div className="flex-1">
                    <NavLink
                      to={item.path}
                      title={isSidebarCollapsed ? item.name : ''}
                      className={({ isActive: linkActive }) =>
                        `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group hover:translate-x-[2px] ${
                          linkActive || (isActive && !item.hasSubmenu)
                            ? 'bg-[#6366f1] text-white'
                            : 'text-[#7a94bb] hover:bg-indigo-300 hover:text-white'
                        }`
                      }
                    >
                      <div
                        className={`flex items-center ${
                          isSidebarCollapsed ? 'justify-center w-full' : 'gap-3'
                        }`}
                      >
                        <item.icon
                          size={18}
                          strokeWidth={isActive ? 2.5 : 2}
                          className={`transition-colors duration-200 ${
                              isActive ? 'text-white' : 'group-hover:text-white'
                            }`}                      
                        />
                        {!isSidebarCollapsed && (
                          <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
                            {item.name}
                          </span>
                        )}
                      </div>

                      {!isSidebarCollapsed && item.hasSubmenu && (
                        <ChevronDown
                          size={12}
                          className={`transition-transform duration-200 ${
                            isActive ? 'rotate-0 text-white' : '-rotate-90 opacity-40'
                          }`}
                        />
                      )}
                    </NavLink>

                    {!isSidebarCollapsed && item.hasSubmenu && isActive && (
                      <div className="ml-4 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                        {item.submenu?.map((sub) => (
                          <NavLink
                            key={sub.name}
                            to={sub.path}
                            className={({ isActive: innerSubActive }) =>
                              `flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                innerSubActive
                                  ? 'text-[#6366f1] bg-indigo-500/10'
                                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#2a2d32]'
                              }`
                            }
                          >
                            {({ isActive: subActive }) => (
                              <>
                                <div
                                  className={`w-1 h-4 rounded-full mr-1 ${
                                    subActive ? 'bg-[#6366f1]' : 'bg-slate-700'
                                  }`}
                                ></div>
                                {sub.name}
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={async () => { await logout(); navigate('/login'); }}
            title={isSidebarCollapsed ? 'Logout' : ''}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 w-full text-left text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all`}
          >
            <LogOut size={18} />
            {!isSidebarCollapsed && <span className="text-xs font-bold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-[#c7d2fe] flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black text-slate-800 tracking-tight">{getPageTitle()}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            {location.pathname == '/dashboard' && (
              <button 
                onClick={() => navigate('/create-job')}
                className="bg-[#6366f1] hover:bg-[#4f52d4] text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all text-sm shadow-lg shadow-indigo-500/20"
              >
                <Plus size={16} strokeWidth={3} />
                New Job
              </button>
            )}
            {location.pathname == '/users' && (
              <button 
                 onClick={() => setActiveModal('add')}
                className="bg-[#6366f1] hover:bg-indigo-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all text-sm shadow-lg shadow-indigo-500/20"
              >
                <UserRoundPlus size={16} strokeWidth={2} />
                Add User
              </button>
            )}
            {location.pathname == '/templates' && (
              <button
                onClick={() => setActiveModal('create')}
                className="bg-[#6366f1] hover:bg-indigo-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all text-sm shadow-lg shadow-indigo-500/20"
              >
                <Plus size={16} strokeWidth={2} /> Create Template
              </button>
            )}
            <div className="flex items-center gap-4 border-l border-slate-100 pl-5">
              {/* <button className="text-slate-400 hover:text-indigo-500 transition-colors">
                <Search size={18} strokeWidth={2.5} />
              </button>
              <button className="text-slate-400 hover:text-indigo-500 transition-colors relative">
                <Bell size={18} strokeWidth={2.5} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
              </button> */}
              
              <div className="relative">
                <div 
                  className="flex items-center gap-2 ml-1 group cursor-pointer"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                >
                  <img 
                    src="https://picsum.photos/seed/user/32/32" 
                    alt="User" 
                    className="w-8 h-8 rounded-lg border border-slate-200 shadow-sm"
                  />
                  <ChevronDown size={12} className={`text-slate-300 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2.5 w-44 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                      <button 
                        onClick={() => { navigate('/profile'); setIsProfileMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                      >
                        <UserIcon size={14} className="text-slate-400" />
                        Profile
                      </button>
                      <div className="h-px bg-slate-50 my-1"></div>
                      <button 
                        onClick={async () => { await logout(); navigate('/login'); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-[#e05252] hover:bg-red-50 flex items-center gap-3"
                      >
                        <LogOut size={14} />
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto bg-[#f5f5ff] p-6 relative scrollbar-hide">
          <Outlet context={{ setActiveModal, activeModal }} />
        </div>

        {/* Floating Chat Button */}
        <button 
          type="button"
          title="Chat"
          onClick={() => setIsRealtimeChatOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-[#6366f1] text-white rounded-full shadow-2xl hover:shadow-indigo-500/40 hover:bg-[#4f52d4] transition-all flex items-center justify-center z-20 group hover:scale-110 active:scale-95"
        >
          <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" />
        </button>

        {/* Realtime Chat */}
        <EnhancedChatDrawer isOpen={isRealtimeChatOpen} onClose={() => setIsRealtimeChatOpen(false)} />
      </main>
    </div>
  );
};

export default DashboardLayout;
