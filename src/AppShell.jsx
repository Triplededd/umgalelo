import { useState } from "react";
import { UserCog } from "lucide-react";
import StokvelList from "./components/StokvelList";
import StokvelDetail from "./components/StokvelDetail";
import AddAdminModal from "./components/AddAdminModal";
import Logo from "./components/Logo";

export default function AppShell({ user, onLogout }) {
  const [selected, setSelected] = useState(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  return (
    <div>
      <header className="max-w-3xl mx-auto px-4 pt-6 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-circle-ink/60">Signed in as {user.name}</span>
          <button
            className="text-sm text-circle-ink/50 hover:text-circle-navy flex items-center gap-1"
            onClick={() => setShowAddAdmin(true)}
            title="Add another administrator"
          >
            <UserCog size={15} />
          </button>
          <button className="text-sm text-circle-ink/50 underline" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      {justAdded && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-green-50 border border-circle-green/30 text-circle-green text-sm rounded-md px-3 py-2">
            New administrator added.
          </div>
        </div>
      )}

      {selected ? (
        <StokvelDetail stokvel={selected} onBack={() => setSelected(null)} />
      ) : (
        <StokvelList onSelect={setSelected} currentUser={user} />
      )}

      {showAddAdmin && (
        <AddAdminModal
          currentUser={user}
          onClose={() => setShowAddAdmin(false)}
          onAdded={() => {
            setShowAddAdmin(false);
            setJustAdded(true);
            setTimeout(() => setJustAdded(false), 4000);
          }}
        />
      )}
    </div>
  );
}
