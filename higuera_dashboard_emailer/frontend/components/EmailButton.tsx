import { getMicrosoftAccessToken } from '../lib/msalAuth';

export default function EmailButton({ message }: { message: string }) {
  const handleSend = async () => {
    const token = await getMicrosoftAccessToken();
    await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    })
    .then(() => alert("Email sent"))
    .catch((err) => alert("Email failed: " + err.message));
  };

  return (
    <button onClick={handleSend} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      📧 Email Report
    </button>
  );
}