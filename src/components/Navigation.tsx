import { FileText, Mic, File } from 'lucide-react';

interface NavigationProps {
  activeTab: 'text' | 'voice' | 'pdf';
  setActiveTab: (tab: 'text' | 'voice' | 'pdf') => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: 'text' as const, label: 'Text Translation', icon: FileText },
    { id: 'voice' as const, label: 'Voice Translation', icon: Mic },
    { id: 'pdf' as const, label: 'PDF Translation', icon: File },
  ];

  return (
    <nav className="flex justify-center mb-8">
      <div className="bg-white rounded-lg shadow-lg p-1 flex space-x-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50'
              }`}
            >
              <Icon className="mr-2 h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
