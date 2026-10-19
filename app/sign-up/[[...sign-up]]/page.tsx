import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <>
      <header className="nav"><div className="navin"><div className="brand"><img className="bas-logo" src="/bas-mark.png" alt="BAS" /><div><div className="t1">BUSINESS ANALYST SERVICES</div><div className="t2">Course Portal</div></div></div></div></header>
      <main className="authwrap"><SignUp /></main>
    </>
  );
}
