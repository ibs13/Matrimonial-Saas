'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { membershipApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { PlanDetails, UserMembershipResponse, MembershipPlan } from '@/types';

const PLAN_COLORS: Record<MembershipPlan, { ring: string; badge: string; btn: string }> = {
  Free:    { ring: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700',        btn: 'bg-gray-100 text-gray-500 cursor-default' },
  Basic:   { ring: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',        btn: 'bg-blue-600 text-white hover:bg-blue-700' },
  Premium: { ring: 'border-primary-300', badge: 'bg-primary-100 text-primary-700', btn: 'bg-primary-600 text-white hover:bg-primary-700' },
  Vip:     { ring: 'border-amber-300',  badge: 'bg-amber-100 text-amber-700',      btn: 'bg-amber-500 text-white hover:bg-amber-600' },
};

export default function MembershipPage() {
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [membership, setMembership] = useState<UserMembershipResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      membershipApi.getPlans(),
      membershipApi.getMe().catch(() => null),
    ])
      .then(([p, m]) => {
        setPlans(p);
        setMembership(m);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>;
  }

  const currentPlan = (membership?.plan ?? 'Free') as MembershipPlan;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Membership Plans</h1>
        <p className="text-gray-500 mt-2">
          Choose a plan that fits your needs. Upgrade or downgrade any time.
        </p>
        {membership && (
          <p className="mt-2 text-sm text-gray-500">
            You are currently on the{' '}
            <span className={`font-semibold px-1.5 py-0.5 rounded ${PLAN_COLORS[currentPlan].badge}`}>
              {currentPlan}
            </span>{' '}
            plan.
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const planKey = plan.plan as MembershipPlan;
          const colors = PLAN_COLORS[planKey];
          const isCurrent = planKey === currentPlan;

          return (
            <div
              key={plan.plan}
              className={`relative rounded-2xl border-2 bg-white p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${colors.ring} ${isCurrent ? 'shadow-md' : ''}`}
            >
              {isCurrent && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full ${colors.badge}`}>
                  Current plan
                </span>
              )}

              <div>
                <h2 className="text-lg font-bold text-gray-900">{plan.plan}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>
              </div>

              <div>
                {plan.monthlyPriceBdt === 0 ? (
                  <p className="text-3xl font-extrabold text-gray-900">Free</p>
                ) : (
                  <p className="text-3xl font-extrabold text-gray-900">
                    ৳{plan.monthlyPriceBdt.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                <Feature
                  label={plan.monthlyInterestLimit === -1
                    ? 'Unlimited interests / month'
                    : `${plan.monthlyInterestLimit} interests / month`}
                  enabled
                />
                <Feature label="Advanced search filters" enabled={plan.advancedSearch} />
                <Feature label="Profile boost"           enabled={plan.profileBoost} />
                <Feature label="Contact unlock"          enabled={plan.contactUnlock} />
              </ul>

              {isCurrent ? (
                <button disabled className={`w-full py-2 rounded-lg text-sm font-medium ${colors.btn}`}>
                  Current plan
                </button>
              ) : (
                <button
                  disabled
                  title="Payment coming soon"
                  className="w-full py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  {planKey === 'Free' ? 'Downgrade' : 'Upgrade'} — coming soon
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-5 text-center text-sm text-gray-500 space-y-1">
        <p className="font-medium text-gray-700">Payment integration coming soon</p>
        <p>All features are available for evaluation. Plan upgrades will be enabled in a future release.</p>
        <Link href="/dashboard" className="inline-block mt-2 text-primary-600 hover:underline text-xs">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function Feature({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${enabled ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
        enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
      }`}>
        {enabled ? '✓' : '✕'}
      </span>
      {label}
    </li>
  );
}
