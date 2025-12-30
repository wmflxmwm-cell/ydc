import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Trash2, CheckCircle2 } from 'lucide-react';
import { userService, User } from '../api/services/userService';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        id: '',
        password: '',
        name: '',
        role: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await userService.register(formData);
            alert('사용자가 등록되었습니다.');
            setFormData({ id: '', password: '', name: '', role: '' });
            fetchUsers();
        } catch (error) {
            console.error('Failed to register user:', error);
            alert('사용자 등록에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">사용자 관리</h2>
                    <p className="text-slate-500 text-sm mt-1">시스템 접속 계정을 관리합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 사용자 등록 폼 */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-indigo-100 p-2 rounded-lg">
                                <UserPlus className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="font-bold text-slate-900">신규 사용자 등록</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">아이디</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.id}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="user_id"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">비밀번호</label>
                                <input
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">이름</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="홍길동"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">역할/부서</label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
                                >
                                    <option value="">역할 선택</option>
                                    <option value="시스템 총괄">시스템 총괄</option>
                                    <option value="품질 관리">품질 관리</option>
                                    <option value="생산 기술">생산 기술</option>
                                    <option value="금형 기술">금형 기술</option>
                                    <option value="영업 관리">영업 관리</option>
                                    <option value="MANAGER">MANAGER</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? '등록 중...' : '사용자 등록'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* 사용자 목록 */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-100 p-2 rounded-lg">
                                    <Users className="w-5 h-5 text-slate-600" />
                                </div>
                                <h3 className="font-bold text-slate-900">등록된 사용자 목록</h3>
                            </div>
                            <span className="text-sm text-slate-500 font-medium">총 {users.length}명</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">이름</th>
                                        <th className="px-6 py-3">아이디</th>
                                        <th className="px-6 py-3">역할</th>
                                        <th className="px-6 py-3">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500">로딩 중...</td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500">등록된 사용자가 없습니다.</td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3 font-bold text-slate-900">{user.name}</td>
                                                <td className="px-6 py-3 text-slate-600 font-mono text-xs">{user.id}</td>
                                                <td className="px-6 py-3">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-green-600 flex items-center gap-1">
                                                    <CheckCircle2 size={14} />
                                                    <span className="text-xs font-bold">활성</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
