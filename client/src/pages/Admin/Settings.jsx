import { useState, useEffect, useContext } from 'react';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';
import {
    Save, Lock, CheckCircle2, AlertCircle,
    QrCode, Upload, Camera, Loader2, Eye, EyeOff,
    LayoutGrid, Grid, List, Palette, Building2, Shield
} from 'lucide-react';

/* ── QR Upload Card ────────────────────────────────────────────────────────── */
const QrCard = ({ label, currentUrl, type, token, onUploaded, isSecondary }) => {
    const [preview, setPreview] = useState(currentUrl || null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [localMsg, setLocalMsg] = useState(null);

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
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            setLocalMsg({ ok: true, text: 'Updated!' });
            onUploaded(res.data);
            setSelectedFile(null);
        } catch (err) {
            setLocalMsg({ ok: false, text: err.response?.data?.message || 'Failed' });
        }
        setUploading(false);
    };

    const galleryId = `gallery-${type}`;
    const cameraId = `camera-${type}`;

    return (
        <div className="flex flex-col gap-3 bg-[var(--theme-bg-muted)] border border-[var(--theme-border)] rounded-xl p-4">
            <p className="text-xs font-semibold text-[var(--theme-text-muted)]">{label}</p>

            <div className="flex items-center justify-center bg-white rounded-lg overflow-hidden h-36 border border-[var(--theme-border)]">
                {preview
                    ? <img src={preview} alt="QR" className="h-full w-full object-contain p-3" />
                    : <div className="flex flex-col items-center gap-2 text-gray-300">
                        <QrCode size={40} strokeWidth={1.5} />
                        <p className="text-xs text-gray-400">No QR uploaded</p>
                    </div>
                }
            </div>

            <div className={`grid gap-2 ${isSecondary ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <label htmlFor={galleryId} className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-600/10 dark:hover:bg-violet-600/20 border border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-medium cursor-pointer transition-colors">
                    <Upload size={13} /> Gallery
                </label>
                <input id={galleryId} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                {isSecondary && (
                    <>
                        <label htmlFor={cameraId} className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium cursor-pointer transition-colors">
                            <Camera size={13} /> Camera
                        </label>
                        <input id={cameraId} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                    </>
                )}
            </div>

            {selectedFile && (
                <button type="button" onClick={handleUpload} disabled={uploading}
                    className="w-full h-9 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {uploading ? 'Uploading...' : 'Save QR'}
                </button>
            )}
            {localMsg && !selectedFile && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${localMsg.ok ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                    {localMsg.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    {localMsg.text}
                </div>
            )}
        </div>
    );
};

/* ── Section Header ────────────────────────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, title, color = 'blue' }) => {
    const colors = {
        blue: 'text-blue-500',
        violet: 'text-violet-500',
        emerald: 'text-emerald-500',
        orange: 'text-orange-500',
        rose: 'text-rose-500',
    };
    return (
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--theme-border)]">
            <Icon size={17} className={colors[color]} />
            <h3 className="text-sm font-semibold text-[var(--theme-text-main)]">{title}</h3>
        </div>
    );
};

/* ── Field ─────────────────────────────────────────────────────────────────── */
const Field = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--theme-text-muted)]">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full h-11 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-lg px-3.5 text-sm text-[var(--theme-text-main)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all";

/* ── Notice ────────────────────────────────────────────────────────────────── */
const Notice = ({ msg }) => {
    if (!msg) return null;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {msg.text}
        </div>
    );
};

const SaveBtn = ({ loading, label = 'Save Changes', color = 'blue' }) => {
    const bg = {
        blue: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20',
        emerald: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20',
        orange: 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20',
        rose: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20',
    };
    return (
        <button type="submit" disabled={loading}
            className={`h-10 px-6 ${bg[color]} text-white text-xs font-semibold rounded-lg transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2`}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {label}
        </button>
    );
};

const Card = ({ children }) => (
    <section className="bg-[var(--theme-bg-card)] rounded-xl border border-[var(--theme-border)] overflow-hidden shadow-sm">
        {children}
    </section>
);

const Footer = ({ section, color, label, msgs, loading }) => (
    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-5 mt-5 border-t border-[var(--theme-border)]">
        <Notice msg={msgs[section]} />
        <SaveBtn loading={loading} label={label} color={color} />
    </div>
);

/* ── Main Settings ─────────────────────────────────────────────────────────── */
const Settings = () => {
    const { user, settings, fetchSettings } = useContext(AuthContext);
    const [generalConfig, setGeneralConfig] = useState({
        restaurantName: '', address: '', currency: 'INR', currencySymbol: '₹',
        taxRate: 5, gstNumber: '',
        pendingColor: '#3b82f6', acceptedColor: '#8b5cf6',
        preparingColor: '#f59e0b', readyColor: '#10b981',
        dashboardView: 'all',
        dineInEnabled: true, tableMapEnabled: true, takeawayEnabled: true, waiterServiceEnabled: true
    });
    const [passwordData, setPasswordData] = useState({ role: 'admin', newPassword: '', confirmPassword: '' });
    const [qrUrls, setQrUrls] = useState({ standardQrUrl: null, secondaryQrUrl: null });
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msgs, setMsgs] = useState({});

    const setMsg = (key, type, text) => {
        setMsgs(p => ({ ...p, [key]: { type, text } }));
        setTimeout(() => setMsgs(p => { const n = { ...p }; delete n[key]; return n; }), 4000);
    };

    useEffect(() => {
        if (settings) {
            setGeneralConfig({
                restaurantName: settings.restaurantName || '',
                address: settings.address || '',
                currency: settings.currency || 'INR',
                currencySymbol: settings.currencySymbol || '₹',
                taxRate: settings.taxRate || 0,
                gstNumber: settings.gstNumber || '',
                pendingColor: settings.pendingColor || '#3b82f6',
                acceptedColor: settings.acceptedColor || '#8b5cf6',
                preparingColor: settings.preparingColor || '#f59e0b',
                readyColor: settings.readyColor || '#10b981',
                dashboardView: settings.dashboardView || 'all',
                dineInEnabled: settings.dineInEnabled !== false,
                tableMapEnabled: settings.tableMapEnabled !== false,
                takeawayEnabled: settings.takeawayEnabled !== false,
                waiterServiceEnabled: settings.waiterServiceEnabled !== false,
            });
        }
    }, [settings]);

    useEffect(() => {
        api.get('/api/settings/qr').then(res => setQrUrls(res.data)).catch(() => {});
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setGeneralConfig(prev => {
            const upd = { ...prev, [name]: value };
            if (name === 'currency') {
                if (value === 'INR') upd.currencySymbol = '₹';
                else if (value === 'USD') upd.currencySymbol = '$';
                else if (value === 'EUR') upd.currencySymbol = '€';
            }
            return upd;
        });
    };

    const saveConfig = async (e, key = 'general') => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            await api.put('/api/settings', generalConfig, { headers: { Authorization: `Bearer ${user.token}` } });
            await fetchSettings();
            setMsg(key, 'success', 'Saved successfully');
        } catch (err) {
            setMsg(key, 'error', err.response?.data?.message || 'Save failed');
        }
        setLoading(false);
    };

    const savePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) return setMsg('security', 'error', 'Passwords do not match');
        if (passwordData.newPassword.length < 6) return setMsg('security', 'error', 'Minimum 6 characters');
        setLoading(true);
        try {
            await api.post('/api/settings/change-password',
                { role: passwordData.role, newPassword: passwordData.newPassword },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setMsg('security', 'success', `Password updated for ${passwordData.role}`);
            setPasswordData({ role: 'admin', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setMsg('security', 'error', err.response?.data?.message || 'Update failed');
        }
        setLoading(false);
    };

    if (!settings) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-sm text-[var(--theme-text-muted)]">Loading settings...</p>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-28">

            {/* Page title */}
            <div className="mb-1">
                <h1 className="text-xl font-bold text-[var(--theme-text-main)]">Settings</h1>
                <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">Manage restaurant configuration</p>
            </div>

            {/* Business Info */}
            <Card>
                <SectionHeader icon={Building2} title="Business Information" color="blue" />
                <form onSubmit={saveConfig} className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <Field label="Restaurant Name">
                            <input type="text" name="restaurantName" value={generalConfig.restaurantName} onChange={handleChange} className={inputCls} />
                        </Field>
                        <Field label="Address">
                            <input type="text" name="address" value={generalConfig.address} onChange={handleChange} className={inputCls} />
                        </Field>
                        <Field label="Currency">
                            <select name="currency" value={generalConfig.currency} onChange={handleChange} className={inputCls}>
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Tax Rate (%)">
                                <input type="number" name="taxRate" value={generalConfig.taxRate} onChange={handleChange} step="0.1" className={inputCls} />
                            </Field>
                            <Field label="GST / VAT No.">
                                <input type="text" name="gstNumber" value={generalConfig.gstNumber} onChange={handleChange} className={inputCls} />
                            </Field>
                        </div>
                    </div>
                    <Footer section="general" color="blue" label="Save" msgs={msgs} loading={loading} />
                </form>
            </Card>

            {/* QR Codes */}
            <Card>
                <SectionHeader icon={QrCode} title="Payment QR Codes" color="violet" />
                <div className="p-5 space-y-3">
                    <p className="text-xs text-[var(--theme-text-muted)]">Upload QR codes for cashier payment processing.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <QrCard label="Standard QR" type="standard" currentUrl={qrUrls.standardQrUrl} token={user?.token}
                            onUploaded={res => setQrUrls(p => ({ ...p, standardQrUrl: res.standardQrUrl }))} isSecondary={false} />
                        <QrCard label="Secondary QR" type="secondary" currentUrl={qrUrls.secondaryQrUrl} token={user?.token}
                            onUploaded={res => setQrUrls(p => ({ ...p, secondaryQrUrl: res.secondaryQrUrl }))} isSecondary={true} />
                    </div>
                </div>
            </Card>

            {/* Order Status Colors */}
            <Card>
                <SectionHeader icon={Palette} title="Order Status Colors" color="emerald" />
                <div className="p-5">
                    <div className="flex flex-col gap-2 mb-4">
                        {[
                            { key: 'pending', label: 'Pending' },
                            { key: 'accepted', label: 'Accepted' },
                            { key: 'preparing', label: 'Preparing' },
                            { key: 'ready', label: 'Ready' },
                        ].map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-md overflow-hidden border border-[var(--theme-border)] relative shrink-0"
                                    style={{ backgroundColor: generalConfig[`${key}Color`] }}>
                                    <input type="color" name={`${key}Color`} value={generalConfig[`${key}Color`]}
                                        onChange={handleChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>
                                <p className="text-xs font-medium text-[var(--theme-text-main)] w-20">{label}</p>
                                <p className="text-[10px] font-mono text-[var(--theme-text-muted)]">{generalConfig[`${key}Color`].toUpperCase()}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-5 border-t border-[var(--theme-border)]">
                        <Notice msg={msgs['colors']} />
                        <button type="button" onClick={e => saveConfig(e, 'colors')} disabled={loading}
                            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Colors
                        </button>
                    </div>
                </div>
            </Card>

            {/* Dashboard Layout */}
            <Card>
                <SectionHeader icon={LayoutGrid} title="Dashboard Layout" color="orange" />
                <div className="p-5">
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-xl">
                        {[
                            { id: 'one', icon: List, label: 'Single' },
                            { id: 'two', icon: Grid, label: 'Dual' },
                            { id: 'all', icon: LayoutGrid, label: 'All' },
                        ].map(opt => (
                            <button key={opt.id} type="button"
                                onClick={() => setGeneralConfig({ ...generalConfig, dashboardView: opt.id })}
                                className={`flex items-center justify-center gap-2 h-11 rounded-lg text-xs font-semibold transition-all ${
                                    generalConfig.dashboardView === opt.id
                                        ? 'bg-orange-500 text-white shadow-md'
                                        : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)]'
                                }`}>
                                <opt.icon size={16} />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-5 mt-4 border-t border-[var(--theme-border)]">
                        <Notice msg={msgs['layout']} />
                        <button type="button" onClick={e => saveConfig(e, 'layout')} disabled={loading}
                            className="h-10 px-6 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Layout
                        </button>
                    </div>
                </div>
            </Card>



            {/* Password */}
            <Card>
                <SectionHeader icon={Shield} title="Change Password" color="rose" />
                <form onSubmit={savePassword} className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <Field label="Role">
                            <select value={passwordData.role} onChange={e => setPasswordData({ ...passwordData, role: e.target.value })}
                                className={inputCls.replace('focus:border-blue-500 focus:ring-blue-500/10', 'focus:border-rose-500 focus:ring-rose-500/10')}>
                                <option value="admin">Admin</option>
                                <option value="waiter">Waiter</option>
                                <option value="kitchen">Kitchen</option>
                                <option value="cashier">Cashier</option>
                            </select>
                        </Field>
                        <Field label="New Password">
                            <div className="relative">
                                <input type={showNew ? 'text' : 'password'} value={passwordData.newPassword}
                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className={`${inputCls.replace('focus:border-blue-500 focus:ring-blue-500/10', 'focus:border-rose-500 focus:ring-rose-500/10')} pr-10`} />
                                <button type="button" onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text-main)] transition-colors">
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>
                        <Field label="Confirm Password">
                            <div className="relative">
                                <input type={showConfirm ? 'text' : 'password'} value={passwordData.confirmPassword}
                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className={`${inputCls.replace('focus:border-blue-500 focus:ring-blue-500/10', 'focus:border-rose-500 focus:ring-rose-500/10')} pr-10`} />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text-main)] transition-colors">
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-5 border-t border-[var(--theme-border)]">
                        <Notice msg={msgs['security']} />
                        <button type="submit" disabled={loading}
                            className="h-10 px-6 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center gap-2">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                            Update Password
                        </button>
                    </div>
                </form>
            </Card>

        </div>
    );
};

export default Settings;
