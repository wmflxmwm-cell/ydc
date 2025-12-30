import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Trash2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { userService, UserWithPassword } from '../api/services/userService';
import { getTranslations } from '../utils/translations';

const UserManagement: React.FC = () => {
    const t = getTranslations();
    const [users, setUsers] = useState<UserWithPassword[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

    // Form state
    const [formData, setFormData] = useState({
        id: '',
        password: '',
        name: '',
        role: ''
    });

    useEffect(() => {
        // Check if current user is admin
        const savedUser = localStorage.getItem('apqp_session');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setIsAdmin(user.role === 'MANAGER' || user.role?.includes('총괄'));
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await userService.getAll(isAdmin);
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm(`사용자 "${id}"를 삭제하시겠습니까?`)) {
            return;
        }
        try {
            await userService.delete(id);
            await fetchUsers();
            alert('사용자가 삭제되었습니다.');
        } catch (error: any) {
            console.error('Failed to delete user:', error);
            const errorMessage = error.response?.data?.error || error.message || '사용자 삭제에 실패했습니다.';
            alert(`사용자 삭제 실패: ${errorMessage}`);
        }
    };

    const togglePasswordVisibility = (userId: string) => {
        setShowPasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await userService.register(formData);
            
            // 등록 후 실제로 DB에서 사용자가 저장되었는지 확인
            await new Promise(resolve => setTimeout(resolve, 500)); // DB 동기화 대기
            await fetchUsers();
            
            // 등록된 사용자가 목록에 있는지 확인
            const updatedUsers = await userService.getAll(isAdmin);
            const registeredUser = updatedUsers.find(u => u.id === formData.id);
            
            if (registeredUser) {
                alert(`사용자 "${formData.name}" (${formData.id})가 성공적으로 등록되었습니다.`);
                setFormData({ id: '', password: '', name: '', role: '' });
            } else {
                throw new Error('사용자가 등록되었지만 목록에 나타나지 않습니다. 서버를 확인하세요.');
            }
        } catch (error: any) {
            console.error('Failed to register user:', error);
            const errorMessage = error.response?.data?.message || error.message || '사용자 등록에 실패했습니다.';
            alert(`사용자 등록 실패: ${errorMessage}`);
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
                            <h3 className="font-bold text-slate-900">{t.userManagement.newUser}</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.userManagement.userId}</label>
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
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.userManagement.password}</label>
                                <input
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    data-form-type="other"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    value={formData.password}
                                    onChange={e => {
                                      const newValue = e.target.value;
                                      console.log('Registration password input changed:', { length: newValue.length, preview: newValue.substring(0, 3) + '...' });
                                      setFormData({ ...formData, password: newValue });
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.userManagement.name}</label>
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
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.userManagement.role}</label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
                                >
                                    <option value="">{t.userManagement.selectRole}</option>
                                    <option value="개발팀">개발팀</option>
                                    <option value="품질팀">품질팀</option>
                                    <option value="로지스틱">로지스틱</option>
                                    <option value="구매">구매</option>
                                    <option value="생산관리">생산관리</option>
                                    <option value="생산1팀">생산1팀</option>
                                    <option value="생산2팀">생산2팀</option>
                                    <option value="금형팀">금형팀</option>
                                    <option value="본사 개발">본사 개발</option>
                                    <option value="본사 품질">본사 품질</option>
                                    <option value="MANAGER">MANAGER (관리자)</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? t.userManagement.registering : t.userManagement.register}
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
                                <h3 className="font-bold text-slate-900">{t.userManagement.userList}</h3>
                            </div>
                            <span className="text-sm text-slate-500 font-medium">{t.userManagement.totalUsers.replace('{count}', users.length.toString())}</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">{t.userManagement.name}</th>
                                        <th className="px-6 py-3">{t.userManagement.userId}</th>
                                        <th className="px-6 py-3">{t.userManagement.role}</th>
                                        {isAdmin && <th className="px-6 py-3">비밀번호</th>}
                                        <th className="px-6 py-3">{t.userManagement.status}</th>
                                        <th className="px-6 py-3">작업</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-slate-500">{t.userManagement.loading}</td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-slate-500">{t.userManagement.noUsers}</td>
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
                                                {isAdmin && (
                                                    <td className="px-6 py-3">
                                                        {user.password ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs text-slate-700">
                                                                    {showPasswords[user.id] ? user.password : '••••••••'}
                                                                </span>
                                                                <button
                                                                    onClick={() => togglePasswordVisibility(user.id)}
                                                                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                                                                    title={showPasswords[user.id] ? '비밀번호 숨기기' : '비밀번호 보기'}
                                                                >
                                                                    {showPasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-6 py-3 text-green-600 flex items-center gap-1">
                                                    <CheckCircle2 size={14} />
                                                    <span className="text-xs font-bold">{t.userManagement.active}</span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                                        title="사용자 삭제"
                                                        disabled={user.role === 'MANAGER' && user.id === 'admin'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
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
