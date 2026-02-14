import SetterProfileContent from './setter-profile-content';

export default async function SetterProfilePage({
  params,
}: {
  params: Promise<{ setter_username: string }>;
}) {
  const { setter_username } = await params;
  return <SetterProfileContent username={decodeURIComponent(setter_username)} />;
}
