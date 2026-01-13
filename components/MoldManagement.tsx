import React, { useState } from 'react';
import { Wrench } from 'lucide-react';

interface Props {
  user?: { id: string; name: string; role: string };
}

const MoldManagement: React.FC<Props> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      borderRadius: '8px',
      border: '2px solid #e2e8f0',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-600" />
          <span>증작금형 관리</span>
          <span className="text-slate-400">/ Mold Management</span>
        </div>
      </div>

      <div className="p-8 text-center text-slate-500">
        <Wrench className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-semibold mb-2">증작금형 관리 기능</p>
        <p className="text-sm">이 기능은 곧 추가될 예정입니다.</p>
      </div>
    </div>
  );
};

export default MoldManagement;

