'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { 
  getSyncStatus, 
  getUserProfile, 
  updateUserProfile, 
  changePassword, 
  verifyPassword,
  clearLocalData,
  deleteAccount,
  UserProfile 
} from '@/lib/api'
import { useToast } from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'

export default function AccountPage() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  // Edit states
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutWithClear, setLogoutWithClear] = useState(false)
  
  // Switch account states
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [switchPassword, setSwitchPassword] = useState('')
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  
  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [status, profileData] = await Promise.all([
        getSyncStatus(),
        getUserProfile().catch(() => null)
      ])
      setSyncStatus(status)
      setProfile(profileData)
      if (profileData?.display_name) {
        setNewDisplayName(profileData.display_name)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout(logoutWithClear)
      showToast(logoutWithClear ? '已登出并清除本地数据' : '已登出', 'success')
    } catch (error) {
      console.error('Logout failed:', error)
      showToast('登出失败', 'error')
    }
    setShowLogoutConfirm(false)
  }

  const handleSaveName = async () => {
    if (!newDisplayName.trim()) {
      showToast('请输入显示名称', 'error')
      return
    }
    
    setSavingName(true)
    try {
      await updateUserProfile(newDisplayName.trim())
      showToast('名称已更新', 'success')
      setEditingName(false)
      loadData()
    } catch (error) {
      console.error('Failed to update name:', error)
      showToast('更新失败', 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showToast('请填写所有密码字段', 'error')
      return
    }
    
    if (newPassword !== confirmNewPassword) {
      showToast('新密码不匹配', 'error')
      return
    }
    
    if (newPassword.length < 6) {
      showToast('新密码至少需要6个字符', 'error')
      return
    }
    
    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      showToast('密码已更新', 'success')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error: any) {
      // 密码错误是预期的用户输入错误，只显示 toast
      const isIncorrectPassword = error.message?.includes('incorrect')
      showToast(isIncorrectPassword ? '当前密码错误' : '密码更新失败', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSwitchAccount = async () => {
    if (!switchPassword) {
      showToast('请输入密码', 'error')
      return
    }
    
    setVerifyingPassword(true)
    try {
      const result = await verifyPassword(switchPassword)
      if (result.verified) {
        // Password verified, proceed to logout and show login screen
        await logout(false)
        showToast('请使用新账户登录', 'success')
      } else {
        showToast('密码错误', 'error')
      }
    } catch {
      showToast('验证失败', 'error')
    } finally {
      setVerifyingPassword(false)
      setShowSwitchModal(false)
      setSwitchPassword('')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('请输入 DELETE 确认删除', 'error')
      return
    }
    
    setDeletingAccount(true)
    try {
      await deleteAccount()
      showToast('账户已删除', 'success')
    } catch (error) {
      console.error('Failed to delete account:', error)
      showToast('删除失败', 'error')
    } finally {
      setDeletingAccount(false)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
    }
  }

  const handleClearLocalData = async () => {
    try {
      await clearLocalData()
      showToast('本地数据已清除', 'success')
      loadData()
    } catch (error) {
      console.error('Failed to clear local data:', error)
      showToast('清除失败', 'error')
    }
  }

  const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/80 relative pb-20 md:pb-0">
      <div className="container mx-auto px-3 md:px-6 py-3 md:py-12 max-w-2xl">
        <div className="rounded-3xl bg-white dark:bg-slate-900/70 border border-white/70 dark:border-white/10 shadow-sm md:shadow-[0_25px_60px_rgba(31,18,53,0.08)] backdrop-blur-xl px-4 md:px-8 py-5 md:py-10 relative overflow-hidden">
          
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--lover-rose), var(--lover-petal), var(--lover-lilac))',
                }}
              >
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  账户
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 font-medium">
                  管理你的个人资料和同步
                </p>
              </div>
            </div>
          </div>

          {/* User Info Card */}
          <div className="bg-gradient-to-br from-[#f3ced8]/30 via-white to-[#cfd8ff]/30 rounded-2xl p-6 border border-white/60 shadow-sm mb-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #b0416b 0%, #f3ced8 50%, #cfd8ff 100%)',
                }}
              >
                ✨
              </div>
              <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] outline-none text-sm"
                      placeholder="输入显示名称"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="px-3 py-1.5 bg-[#b0416b] text-white rounded-lg text-sm font-medium hover:bg-[#9a3a5e] disabled:opacity-50"
                    >
                      {savingName ? '...' : '保存'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false)
                        setNewDisplayName(profile?.display_name || '')
                      }}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-sm"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {displayName}
                    </h2>
                    <button
                      onClick={() => {
                        setNewDisplayName(profile?.display_name || '')
                        setEditingName(true)
                      }}
                      className="p-1 text-slate-400 hover:text-[#b0416b] transition-colors"
                      title="编辑名称"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="text-sm text-slate-500 mt-0.5">
                  {profile?.email || user?.email || 'Unknown'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ID: {user?.id || 'Unknown'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">在线</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white/80 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200/80 dark:border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              账户设置
            </h3>
            
            <div className="space-y-3">
              {/* Change Password */}
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900 dark:text-white">修改密码</div>
                    <div className="text-xs text-slate-500">更新你的登录密码</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Switch Account */}
              <button
                onClick={() => setShowSwitchModal(true)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900 dark:text-white">切换账户</div>
                    <div className="text-xs text-slate-500">登录其他账户</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Clear Local Data */}
              <button
                onClick={handleClearLocalData}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900 dark:text-white">清除本地数据</div>
                    <div className="text-xs text-slate-500">清除收藏、短语和概念（不影响云端）</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sync Section - Hidden for local-only setup */}
          {/* 
          <div className="bg-white/80 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200/80 dark:border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🔄</span>
              数据同步
            </h3>
            ... sync UI hidden ...
          </div>
          */}

          {/* Data Overview */}
          <div className="bg-white/80 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200/80 dark:border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span>
              我的数据
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-gradient-to-br from-[#f3ced8]/40 to-white rounded-xl">
                <div className="text-2xl font-bold text-[#b0416b]">
                  {syncStatus?.starred_count || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">收藏</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-[#f8edb7]/40 to-white rounded-xl">
                <div className="text-2xl font-bold text-amber-600">
                  {syncStatus?.phrases_count || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">短语</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-[#cfd8ff]/40 to-white rounded-xl">
                <div className="text-2xl font-bold text-indigo-600">
                  {syncStatus?.concepts_count || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">概念</div>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              setLogoutWithClear(false)
              setShowLogoutConfirm(true)
            }}
            className="w-full py-3 rounded-xl font-semibold text-red-600 border-2 border-red-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2 mb-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出登录
          </button>

          {/* Danger Zone */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
              <span>⚠️</span>
              危险操作
            </h3>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除账户
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              此操作不可撤销，将删除所有数据
            </p>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="退出登录"
        message="确定要退出登录吗？"
        confirmText="退出"
        cancelText="取消"
      >
        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={logoutWithClear}
              onChange={(e) => setLogoutWithClear(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#b0416b] focus:ring-[#b0416b]"
            />
            同时清除本地数据
          </label>
        </div>
      </ConfirmModal>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">修改密码</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">当前密码</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] outline-none"
                  placeholder="输入当前密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] outline-none"
                  placeholder="输入新密码（至少6位）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] outline-none"
                  placeholder="再次输入新密码"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmNewPassword('')
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="flex-1 py-2 rounded-lg bg-[#b0416b] text-white hover:bg-[#9a3a5e] disabled:opacity-50"
              >
                {changingPassword ? '更新中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Account Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">切换账户</h3>
            <p className="text-sm text-slate-500 mb-4">请输入当前账户密码以确认身份</p>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input
                type="password"
                value={switchPassword}
                onChange={(e) => setSwitchPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] outline-none"
                placeholder="输入密码"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSwitchModal(false)
                  setSwitchPassword('')
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSwitchAccount}
                disabled={verifyingPassword}
                className="flex-1 py-2 rounded-lg bg-[#b0416b] text-white hover:bg-[#9a3a5e] disabled:opacity-50"
              >
                {verifyingPassword ? '验证中...' : '确认切换'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 mb-2">⚠️ 删除账户</h3>
            <p className="text-sm text-slate-600 mb-4">
              此操作将永久删除你的账户和所有数据，包括：
            </p>
            <ul className="text-sm text-slate-500 mb-4 space-y-1">
              <li>• 所有收藏的文章</li>
              <li>• 所有保存的短语</li>
              <li>• 所有学习的概念</li>
              <li>• 账户信息</li>
            </ul>
            <p className="text-sm text-red-600 font-medium mb-4">
              请输入 <span className="font-mono bg-red-50 px-1 rounded">DELETE</span> 确认删除
            </p>
            
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
              placeholder="输入 DELETE"
            />
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAccount ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
