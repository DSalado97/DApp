import { Link } from 'react-router-dom';
import { BackupSection } from './profile/BackupSection';
import { KeySection } from './profile/KeySection';
import { ActiveProfileCard, DeleteProfileCard, SwitchProfilesCard } from './profile/ProfilesSection';

export function ProfilePage() {
  return (
    <>
      <ActiveProfileCard />
      <KeySection />
      <BackupSection />
      <SwitchProfilesCard />
      <DeleteProfileCard />
      <p>
        <Link to="/ajustes">Ajustes</Link>
      </p>
    </>
  );
}
