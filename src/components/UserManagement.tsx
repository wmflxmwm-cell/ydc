import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Trash2, CheckCircle2, Eye, EyeOff, Key } from 'lucide-react';
import { userService, UserWithPassword } from '../api/services/userService';
import { getTranslations } from '../utils/translations';
import { getDefaultTabPermissions, TabKey, TAB_KEYS, getTabLabel } from '../utils/tabPermissions';

const UserManagement: React.FC = () => {
    const t = getTranslations();
    const [users, setUsers] = useState<UserWithPassword[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [editingUser, setEditingUser] = useState<UserWithPassword | null>(null);
    const [passwordChangeUserId, setPasswordChangeUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState<string>('');
    const [editFormData, setEditFormData] = useState({ name: '', role: '' });
    const [permissionsEditUser, setPermissionsEditUser] = useState<UserWithPassword | null>(null);
    const [permissionsMode, setPermissionsMode] = useState<'default' | 'all' | 'custom'>('default');
    const [permissionsDraft, setPermissionsDraft] = useState<TabKey[]>([]);
    const [isPermissionsSaving, setIsPermissionsSaving] = useState(false);

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
            const defaultPermissions = getDefaultTabPermissions(user);
            const effectivePermissions = user.tabPermissions ?? defaultPermissions;
            const canManageUsers = effectivePermissions.includes('users');
            setIsAdmin(canManageUsers);
            setCurrentUserId(user.id);
            fetchUsers(canManageUsers);
            return;
        }
        fetchUsers(false);
    }, []);

    const fetchUsers = async (includePassword: boolean = isAdmin) => {
        setIsLoading(true);
        try {
            const data = await userService.getAll(includePassword);
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

    const handleEditUser = (user: UserWithPassword) => {
        setEditingUser(user);
        setEditFormData({ name: user.name, role: user.role });
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        
        try {
            await userService.update(editingUser.id, editFormData);
            await fetchUsers();
            setEditingUser(null);
            alert('사용자 정보가 수정되었습니다.');
        } catch (error: any) {
            console.error('Failed to update user:', error);
            const errorMessage = error.response?.data?.error || error.message || '사용자 정보 수정에 실패했습니다.';
            alert(`사용자 정보 수정 실패: ${errorMessage}`);
        }
    };

    const handleChangePassword = async (userId: string) => {
        if (!newPassword || newPassword.trim() === '') {
            alert('새 비밀번호를 입력해주세요.');
            return;
        }

        try {
            await userService.changePassword(userId, newPassword);
            setPasswordChangeUserId(null);
            setNewPassword('');
            alert('비밀번호가 변경되었습니다.');
        } catch (error: any) {
            console.error('Failed to change password:', error);
            const errorMessage = error.response?.data?.error || error.message || '비밀번호 변경에 실패했습니다.';
            alert(`비밀번호 변경 실패: ${errorMessage}`);
        }
    };

    const formatTabPermissions = (user: UserWithPassword) => {
        const defaultPermissions = getDefaultTabPermissions(user);
        const effectivePermissions = user.tabPermissions ?? defaultPermissions;

        if (user.tabPermissions === null || user.tabPermissions === undefined) {
            return `${t.userManagement.permissionsDefault}: ${effectivePermissions.map((key) => getTabLabel(t, key)).join(', ')}`;
        }
        if (effectivePermissions.length === 0) {
            return t.userManagement.permissionsNone;
        }
        if (effectivePermissions.length === TAB_KEYS.length) {
            return t.userManagement.permissionsAll;
        }
        return effectivePermissions.map((key) => getTabLabel(t, key)).join(', ');
    };

    const normalizeTabPermissions = (tabPermissions?: TabKey[] | null) => {
        if (!tabPermissions || tabPermissions.length === 0) return [];
        return tabPermissions.filter((key) => TAB_KEYS.includes(key));
    };

    const handleEditPermissions = (user: UserWithPassword) => {
        setPermissionsEditUser(user);
        const defaultPermissions = getDefaultTabPermissions(user);
        const normalized = normalizeTabPermissions(user.tabPermissions ?? null);

        if (user.tabPermissions === null || user.tabPermissions === undefined) {
            setPermissionsMode('default');
            setPermissionsDraft(defaultPermissions);
            return;
        }

        if (normalized.length === TAB_KEYS.length) {
            setPermissionsMode('all');
            setPermissionsDraft(TAB_KEYS);
            return;
        }

        setPermissionsMode('custom');
        setPermissionsDraft(normalized);
    };

    const updatePermissionsMode = (mode: 'default' | 'all' | 'custom') => {
        if (!permissionsEditUser) return;
        setPermissionsMode(mode);
        if (mode === 'default') {
            setPermissionsDraft(getDefaultTabPermissions(permissionsEditUser));
        } else if (mode === 'all') {
            setPermissionsDraft(TAB_KEYS);
        }
    };

    const togglePermission = (key: TabKey) => {
        if (permissionsMode !== 'custom') return;
        setPermissionsDraft((prev) => {
            if (prev.includes(key)) {
                return prev.filter((item) => item !== key);
            }
            return [...prev, key];
        });
    };

    const handleSavePermissions = async () => {
        if (!permissionsEditUser) return;
        setIsPermissionsSaving(true);
        try {
            let payload: TabKey[] | null;
            if (permissionsMode === 'default') {
                payload = null;
            } else if (permissionsMode === 'all') {
                payload = TAB_KEYS;
            } else {
                payload = permissionsDraft;
            }
            await userService.updatePermissions(permissionsEditUser.id, payload);

            if (permissionsEditUser.id === currentUserId) {
                const savedUser = localStorage.getItem('apqp_session');
                if (savedUser) {
                    const user = JSON.parse(savedUser);
                    const updatedUser = { ...user, tabPermissions: payload };
                    localStorage.setItem('apqp_session', JSON.stringify(updatedUser));
                }
            }
            await fetchUsers();
            setPermissionsEditUser(null);
            alert(t.userManagement.permissionUpdated);
        } catch (error: any) {
            console.error('Failed to update tab permissions:', error);
            const errorMessage = error.response?.data?.error || error.message || t.userManagement.permissionUpdateFailed;
            alert(`${t.userManagement.permissionUpdateFailed}: ${errorMessage}`);
        } finally {
            setIsPermissionsSaving(false);
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
                                        <th className="px-6 py-3">{t.userManagement.tabPermissions}</th>
                                        {isAdmin && <th className="px-6 py-3">비밀번호</th>}
                                        <th className="px-6 py-3">{t.userManagement.status}</th>
                                        <th className="px-6 py-3">작업</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500">{t.userManagement.loading}</td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500">{t.userManagement.noUsers}</td>
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
                                                <td className="px-6 py-3 text-xs text-slate-600">
                                                    {formatTabPermissions(user)}
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
                                                    <div className="flex items-center gap-2">
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleEditPermissions(user)}
                                                                className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                                                                title={t.userManagement.editPermissions}
                                                            >
                                                                <Key size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                                            title="사용자 삭제"
                                                            disabled={user.role === 'MANAGER' && user.id === 'admin'}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
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

            {/* 사용자 편집 모달 (관리자만) */}
            {isAdmin && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">사용자 정보 편집</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">사용자 ID</label>
                                <input
                                    type="text"
                                    value={editingUser.id}
                                    disabled
                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">이름</label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">역할</label>
                                <select
                                    value={editFormData.role}
                                    onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
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
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveEdit}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                            >
                                저장
                            </button>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 탭 권한 편집 모달 */}
            {isAdmin && permissionsEditUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-xl font-bold text-slate-900">{t.userManagement.permissionsTitle}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            {permissionsEditUser.name} ({permissionsEditUser.id})
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => updatePermissionsMode('default')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                                    permissionsMode === 'default'
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {t.userManagement.permissionsDefault}
                            </button>
                            <button
                                onClick={() => updatePermissionsMode('all')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                                    permissionsMode === 'all'
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {t.userManagement.permissionsAll}
                            </button>
                            <button
                                onClick={() => updatePermissionsMode('custom')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                                    permissionsMode === 'custom'
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {t.userManagement.permissionsCustom}
                            </button>
                        </div>

                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${permissionsMode !== 'custom' ? 'opacity-70' : ''}`}>
                            {TAB_KEYS.map((key) => (
                                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={permissionsDraft.includes(key)}
                                        onChange={() => togglePermission(key)}
                                        disabled={permissionsMode !== 'custom'}
                                    />
                                    <span>{getTabLabel(t, key)}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSavePermissions}
                                disabled={isPermissionsSaving}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {t.userManagement.save}
                            </button>
                            <button
                                onClick={() => setPermissionsEditUser(null)}
                                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 transition-colors"
                            >
                                {t.userManagement.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 비밀번호 변경 모달 */}
            {passwordChangeUserId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">비밀번호 변경</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">새 비밀번호</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="새 비밀번호를 입력하세요"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => handleChangePassword(passwordChangeUserId)}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                            >
                                변경
                            </button>
                            <button
                                onClick={() => {
                                    setPasswordChangeUserId(null);
                                    setNewPassword('');
                                }}
                                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
