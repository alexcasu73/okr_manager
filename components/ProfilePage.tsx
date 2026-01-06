import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Mail,
  Lock,
  Trash2,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { authAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-none dark:ring-1 dark:ring-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Profile picture
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await authAPI.updateProfile({ name, email });
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Errore nel salvataggio');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Le password non coincidono');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('La password deve essere di almeno 8 caratteri');
      return;
    }

    setPasswordLoading(true);

    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Errore nel cambio password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle image upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setImageError('Formato non supportato. Usa JPEG, PNG, GIF o WebP');
      return;
    }

    // Validate file size (500KB)
    if (file.size > 500 * 1024) {
      setImageError('Immagine troppo grande. Massimo 500KB');
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          await authAPI.uploadProfilePicture(base64);
          await refreshUser();
        } catch (err: any) {
          setImageError(err.message || 'Errore nel caricamento');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.onerror = () => {
        setImageError('Errore nella lettura del file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setImageError(err.message || 'Errore nel caricamento');
      setUploadingImage(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle delete profile picture
  const handleDeleteImage = async () => {
    setUploadingImage(true);
    setImageError(null);

    try {
      await authAPI.deleteProfilePicture();
      await refreshUser();
    } catch (err: any) {
      setImageError(err.message || 'Errore nella rimozione');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await authAPI.deleteAccount(deletePassword);
      logout();
      window.location.replace('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Errore nella cancellazione');
    } finally {
      setDeleteLoading(false);
    }
  };

  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=3B82F6&color=fff&size=200`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profilo</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestisci le tue informazioni personali</p>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Foto Profilo</h2>

        <div className="flex items-center gap-6">
          <div className="relative">
            <img
              src={avatarUrl}
              alt={user?.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
              >
                <Camera className="w-4 h-4" />
                Carica foto
              </button>
              {user?.avatar && (
                <button
                  onClick={handleDeleteImage}
                  disabled={uploadingImage}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Rimuovi
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">JPEG, PNG, GIF o WebP. Max 500KB.</p>
            {imageError && (
              <p className="text-xs text-red-600">{imageError}</p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Informazioni Personali</h2>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {profileError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              Profilo aggiornato con successo
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {profileLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salva modifiche
          </button>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Cambia Password</h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              Password cambiata con successo
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password attuale</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nuova password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimo 8 caratteri"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Conferma nuova password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {passwordLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Cambia password
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6 border border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Zona Pericolosa</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Eliminando il tuo account, perderai tutti i tuoi OKR, team e dati associati. Questa azione non può essere annullata.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4" />
          Elimina account
        </button>
      </div>

      {/* Delete Account Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Elimina Account">
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          {deleteError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}

          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Sei sicuro?</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Tutti i tuoi dati saranno eliminati permanentemente.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Conferma con la tua password
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Inserisci la tua password"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={deleteLoading || !deletePassword}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Elimina account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
