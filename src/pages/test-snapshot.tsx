import { NextPage } from 'next';
import Head from 'next/head';
import SnapshotTest from '@/components/diagnostics/SnapshotTest';

/**
 * Test page for Snapshot API integration diagnostics
 * This page doesn't modify any existing UI and is only for debugging
 */
const TestSnapshotPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Snapshot API Diagnostics | govAIrn</title>
        <meta name="description" content="Diagnostic tools for testing Snapshot API integration" />
      </Head>
      
      <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8 bg-gradient-to-b from-black to-slate-950">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-phosphor mb-8 text-center">Snapshot API Diagnostics</h1>
          <SnapshotTest />
        </div>
      </main>
    </>
  );
};

export default TestSnapshotPage;
