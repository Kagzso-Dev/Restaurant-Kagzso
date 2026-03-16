import { useState, useEffect, useContext } from 'react';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';
import { Save, Lock, Settings as SettingsIcon, DollarSign, CheckCircle2, AlertCircle, QrCode, Upload, Camera, Loader2, X, Eye, EyeOff } from 'lucide-react';

/* ── QR Upload Card ───────────────────────────────────────────────────────── */
const QrCard = ({ label, currentUrl, type, token, onUploaded, isSecondary }) => {
    const [preview, setPreview] = useState(currentUrl || null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [localMsg, setLocalMsg] = useState(null);

    // Sync if parent url changes (e.g. on first load)
    useEffect(() => { setPreview(currentUrl || null); }, [currentUrl]);

    const handleFile = (file) => {
        if (!file) return;
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setLocalMsg(null);
        try {
            const formData = new FormData();
            formData.append('type', type);
            formData.append('qr', selectedFile);

            const res = await api.post('/api/settings/qr', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}` 
                }
            });
            setLocalMsg({ ok: true, text: 'QR uploaded successfully!' });
            onUploaded(res.data);
            setSelectedFile(null); // Reset after upload
        } catch (err) {
            const msg = err.response?.data?.message || 'Upload failed';
            setLocalMsg({ ok: false, text: msg });
        }
        setUploading(false);
    };

    const galleryId = `gallery-${type}`;
    const cameraId  = `camera-${type}`;

    return (
        <div className="flex flex-col gap-4 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs font-black text-[var(--theme-text-main)] uppercase tracking-widest">{label}</p>
                {isSecondary && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 uppercase">Temporary</span>
                )}
            </div>

            {/* Preview */}
            <div className="flex items-center justify-center bg-white rounded-xl overflow-hidden h-40 sm:h-48 border border-gray-200 shadow-inner">
                {preview
                    ? <img src={preview} alt="QR preview" className="h-full w-full object-contain p-2" />
                    : <div className="flex flex-col items-center gap-2 text-gray-300">
                        <QrCode size={40} strokeWidth={1} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No QR Found</p>
                    </div>
                }
            </div>

            {/* Buttons stack on mobile, grid on larger */}
            <div className={`flex flex-col sm:grid gap-2 ${isSecondary ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                {/* Gallery / File upload */}
                <label
                    htmlFor={galleryId}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                    <Upload size={14} /> Upload Image
                </label>
                <input
                    id={galleryId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFile(e.target.files?.[0])}
                />

                {/* Camera (secondary only) */}
                {isSecondary && (
                    <>
                        <label
                            htmlFor={cameraId}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold transition-all cursor-pointer active:scale-95"
                        >
                            <Camera size={14} /> Take Photo
                        </label>
                        <input
                            id={cameraId}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={e => handleFile(e.target.files?.[0])}
                        />
                    </>
                )}
            </div>

            {/* Save button */}
            {selectedFile && (
                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {uploading ? 'Processing…' : 'Save Changes'}
                </button>
            )}

            {localMsg && (
                <div className={`p-3 rounded-xl border flex items-start gap-3 animate-slide-up ${
                    localMsg.ok 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                    {localMsg.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                    <p className="text-[11px] font-bold leading-tight uppercase tracking-tight">{localMsg.text}</p>
                </div>
            )}
        </div>
    );
};

/* ── Main Settings Page ───────────────────────────────────────────────────── */
const Settings = () => {
    const { user, settings, fetchSettings } = useContext(AuthContext);
    const [generalConfig, setGeneralConfig] = useState({
        restaurantName: '',
        address: '',
        currency: 'USD',
        currencySymbol: '$',
        taxRate: 5,
        gstNumber: ''
    });

    const [passwordData, setPasswordData] = useState({
        role: 'admin',
        newPassword: '',
        confirmPassword: ''
    });

    const [qrUrls, setQrUrls] = useState({ standardQrUrl: null, secondaryQrUrl: null });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Auto-dismiss toast after 5 seconds
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(null), 5000);
        return () => clearTimeout(timer);
    }, [message]);

    useEffect(() => {
        if (settings) {
            setGeneralConfig({
                restaurantName: settings.restaurantName || '',
                address: settings.address || '',
                currency: settings.currency || 'USD',
                currencySymbol: settings.currencySymbol || '$',
                taxRate: settings.taxRate || 0,
                gstNumber: settings.gstNumber || ''
            });
        }
    }, [settings]);

    // Load current QR URLs on mount
    useEffect(() => {
        api.get('/api/settings/qr')
            .then(res => setQrUrls(res.data))
            .catch(() => {});
    }, []);

    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setGeneralConfig(prev => ({ ...prev, [name]: value }));
        if (name === 'currency') {
            let symbol = '$';
            if (value === 'INR') symbol = '₹';
            if (value === 'EUR') symbol = '€';
            setGeneralConfig(prev => ({ ...prev, [name]: value, currencySymbol: symbol }));
        }
    };

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/api/settings', generalConfig, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            await fetchSettings();
            setMessage({ type: 'success', text: 'Settings updated successfully!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to update settings.' });
        }
        setLoading(false);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match!' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/settings/change-password',
                { role: passwordData.role, newPassword: passwordData.newPassword },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setMessage({ type: 'success', text: `Password for ${passwordData.role} updated successfully!` });
            setPasswordData({ role: 'admin', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password.' });
        }
        setLoading(false);
    };

    const handleQrUploaded = (data) => {
        setQrUrls({ standardQrUrl: data.standardQrUrl, secondaryQrUrl: data.secondaryQrUrl });
        setMessage({ type: 'success', text: 'QR code updated successfully!' });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[var(--theme-text-main)] flex items-center gap-3">
                <SettingsIcon className="text-[var(--theme-text-muted)]" />
                System Settings
            </h2>

            {message && (
                <div className={`
                    fixed top-20 left-4 right-4 sm:left-auto sm:right-6 z-[100] sm:min-w-[320px]
                    p-4 rounded-2xl shadow-2xl border flex items-center gap-3
                    animate-slide-in-right transform transition-all
                    ${message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }
                `}>
                    {message.type === 'success' ? <CheckCircle2 size={24} className="shrink-0" /> : <AlertCircle size={24} className="shrink-0" />}
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-[10px] sm:text-xs uppercase tracking-widest">{message.type === 'success' ? 'Success' : 'Attention'}</p>
                        <p className="text-xs opacity-90 truncate sm:whitespace-normal">{message.text}</p>
                    </div>
                    <button onClick={() => setMessage(null)} className="ml-auto p-2 opacity-40 hover:opacity-100 transition-opacity">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* General Configuration */}
            <div className="bg-[var(--theme-bg-card)] rounded-3xl shadow-xl border border-[var(--theme-border)] overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 px-5 py-4 sm:px-8 sm:py-5 border-b border-[var(--theme-border)] flex items-center justify-between">
                    <h3 className="text-lg font-black text-[var(--theme-text-main)] flex items-center gap-2 uppercase tracking-widest">
                        <DollarSign size={20} className="text-blue-500" />
                        Business Profile
                    </h3>
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">PUBLIC INFO</span>
                </div>

                <form onSubmit={handleConfigSubmit} className="p-5 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)] ml-1">Restaurant Name</label>
                            <input
                                type="text"
                                name="restaurantName"
                                value={generalConfig.restaurantName}
                                onChange={handleConfigChange}
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl p-4 border border-[var(--theme-border)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                                placeholder="Enter Brand Name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)] ml-1">Restaurant Address</label>
                            <input
                                type="text"
                                name="address"
                                value={generalConfig.address}
                                onChange={handleConfigChange}
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl p-4 border border-[var(--theme-border)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                                placeholder="Enter Full Address"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)] ml-1">Currency</label>
                            <div className="relative">
                                <select
                                    name="currency"
                                    value={generalConfig.currency}
                                    onChange={handleConfigChange}
                                    className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl p-4 border border-[var(--theme-border)] focus:border-blue-500 transition-all outline-none font-medium appearance-none"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="INR">INR (₹)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                    <DollarSign size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)] ml-1">Tax Rate (%)</label>
                            <input
                                type="number"
                                name="taxRate"
                                value={generalConfig.taxRate}
                                onChange={handleConfigChange}
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl p-4 border border-[var(--theme-border)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)] ml-1">GST/VAT Number</label>
                            <input
                                type="text"
                                name="gstNumber"
                                value={generalConfig.gstNumber}
                                onChange={handleConfigChange}
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl p-4 border border-[var(--theme-border)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium uppercase"
                                placeholder="e.g. 29ABCDE1234F1Z5"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-5 border-t border-[var(--theme-border)]">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2.5 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:bg-gray-700 uppercase text-xs tracking-widest"
                        >
                            <Save size={18} />
                            <span>Apply Changes</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* QR Payment Management */}
            <div className="bg-[var(--theme-bg-card)] rounded-3xl shadow-xl border border-[var(--theme-border)] overflow-hidden">
                <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/5 px-5 py-4 sm:px-8 sm:py-5 border-b border-[var(--theme-border)] flex items-center justify-between">
                    <h3 className="text-lg font-black text-[var(--theme-text-main)] flex items-center gap-2 uppercase tracking-widest">
                        <QrCode size={20} className="text-violet-500" />
                        QR Payment Management
                    </h3>
                    <span className="text-[10px] font-bold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">CASHIER</span>
                </div>

                <div className="p-5 sm:p-8">
                    <p className="text-xs text-[var(--theme-text-muted)] mb-6">
                        Upload QR codes displayed to customers on the cashier payment screen.
                        Secondary QR can be taken as a live photo (useful for temporary/rotating QR codes).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <QrCard
                            label="Standard QR"
                            type="standard"
                            currentUrl={qrUrls.standardQrUrl}
                            token={user?.token}
                            onUploaded={handleQrUploaded}
                            isSecondary={false}
                        />
                        <QrCard
                            label="Secondary QR"
                            type="secondary"
                            currentUrl={qrUrls.secondaryQrUrl}
                            token={user?.token}
                            onUploaded={handleQrUploaded}
                            isSecondary={true}
                        />
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="bg-[var(--theme-bg-card)] rounded-3xl shadow-xl border border-[var(--theme-border)] overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/5 px-5 py-4 sm:px-8 sm:py-5 border-b border-[var(--theme-border)] flex items-center justify-between">
                    <h3 className="text-lg font-black text-[var(--theme-text-main)] flex items-center gap-2 uppercase tracking-widest">
                        <Lock size={20} className="text-orange-500" />
                        Access & Security
                    </h3>
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">PROTECTED</span>
                </div>

                <form onSubmit={handlePasswordSubmit} className="p-5 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)] ml-1">Staff Role</label>
                            <select
                                value={passwordData.role}
                                onChange={(e) => setPasswordData({ ...passwordData, role: e.target.value })}
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl p-4 border border-[var(--theme-border)] focus:border-orange-500 transition-all outline-none font-medium"
                            >
                                <option value="admin">Admin</option>
                                <option value="waiter">Waiter</option>
                                <option value="kitchen">Kitchen</option>
                                <option value="cashier">Cashier</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)] ml-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl p-4 pr-12 border border-[var(--theme-border)] focus:border-orange-500 outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] hover:text-orange-500 transition-colors focus:outline-none"
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)] ml-1">Verify Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl p-4 pr-12 border border-[var(--theme-border)] focus:border-orange-500 outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] hover:text-orange-500 transition-colors focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-5 border-t border-[var(--theme-border)]">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2.5 px-8 py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:bg-gray-700 uppercase text-xs tracking-widest"
                        >
                            <Save size={18} />
                            <span>Update Security</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
