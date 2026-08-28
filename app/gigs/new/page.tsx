/**
 * Feature 1 -- Post a gig.
 */
import type { Metadata } from 'next';
import { PostGigForm } from '@/components/PostGigForm';

export const metadata: Metadata = {
  title: 'Post a gig',
  description: 'List a service on SkillSwap with a title, category, rate and description.',
};

export default function NewGigPage() {
  return (
    <>
      <div className="page-head">
        <h1>Post a gig</h1>
        <p>
          Describe one service you can deliver. Clear titles get booked — &ldquo;Logo design for
          student clubs&rdquo; beats &ldquo;design work&rdquo;.
        </p>
      </div>
      <PostGigForm />
    </>
  );
}
