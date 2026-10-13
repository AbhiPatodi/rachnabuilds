// Push a batch of scanned prospects into an Instantly campaign as leads, with
// the variables the sequence uses: firstName, storeName, finding, issueCount.
//
// This lives server-side on purpose. The qualifying rules, the greeting rule and
// the opener clean-up are all judgement calls that must be identical every time
// a batch goes out, and the prospects are marked `queued` here so the same store
// is never emailed twice.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addLead, hasInstantlyKey } from '@/lib/instantly';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// prospects.name is always the STORE, never a person, so a greeting can only
// come from the inbox — and only when it is unmistakably a human first name.
// "Hi there" costs nothing; "Hi Databreach" ends the conversation.
const FIRST_NAMES = new Set(`aaron abby abigail adam adrian aidan alan albert alex alexa alexander alexis alice alicia
alison allison allyson amanda amber amelia amy ana andre andrea andrew angela angelo anita ann anna anne annie anthony
april ariane arthur ashley audrey austin barbara barry becky ben benjamin bernard beth bethany betty beverly bill billy
bob bobby brad bradley brandon brenda brendan brett brian bridget brittany brooke brooks bruce bryan caitlin caitlyna
caleb cameron camille carl carla carlos carmen carol caroline carolyn carrie casey catherine cathy cecilia chad charles
charlie charlotte chelsea cheryl chris christian christina christine christopher cindy claire clara clark claudia
clayton clint cody colin collin connie connor corey courtney craig crystal curtis cynthia daisy dale dan dana daniel
danielle danny darren dave david dawn dean deborah debra denise dennis derek diana diane dominic don donald donna doreen
doris dorothy doug douglas drew duncan dustin dylan earl ed eddie edith edward edwin eileen elaine eleanor elena eli
elijah elisa elise elizabeth ellen emily emma eric erica erik erin ernest ethan eugene eva evan evelyn fabrice faith
farrah felicia fernando fiona frances francis frank fred freddie gabriel gaby gail gary gavin gemma gene geoff geoffrey
george gerald gina giovanni glen glenn gloria gordon grace graham grant greg gregory gwen hailey hannah harold harry
hayley hazel heather heidi helen henry holly howard hugh ian irene isaac isabel ivan jack jackie jacob jake james jamie
jan jane janet janice jared jason jay jean jeff jeffrey jenna jennifer jenny jeremy jerry jesse jessica jill jim jimmy
joan joanna joanne jody joe joel john johnny jon jonathan jordan jose joseph josh joshua joy joyce juan judith judy
julia julian julie justin kaitlin karen kari karl kate katherine kathleen kathryn kathy katie katrina kay keith kelly
ken kenneth kevin kim kimberly kirk kris krista kristen kristin kyle lance larry laura lauren laurie lawrence lee leo
leonard leslie lewis liam lillian linda lindsay lindsey lisa liz logan lois lori louis louise lucas lucy luke lydia lynn
madison maggie malcolm marc marcia marco margaret maria marie marilyn mario marion mark marsha marta martha martin mary
mason matt matthew maureen maurice max maya megan melanie melissa meredith micah michael michele michelle miguel mike
miranda miriam mitchell molly monica morgan nancy naomi natalie nathan neil nelson nicholas nick nicole nigel nina noah
noel nora norman olivia oscar owen pablo pam pamela pat patricia patrick paul paula pauline pedro peggy penny pete peter
philip phillip phoebe rachel ralph ramon randy raymond rebecca regina renee rex rhonda ricardo richard rick ricky rita
rob robert roberta robin rodney roger roland ron ronald rosa rose rosemary ross roy ruby russell ruth ryan sabrina sally
sam samantha samuel sandra sandy sara sarah scott sean sebastian serena seth shane shannon sharon shaun shawn sheila
shelley sherry shirley sidney simon sofia sonia sophia sophie spencer stacey stacy stanley stella stephanie stephen
steve steven stewart stuart sue susan suzanne sydney sylvia tamara tammy tanya tara ted teresa terry tessa thelma
theresa thomas tim timothy tina todd tom tommy toni tony tracey tracy travis trevor tricia troy tyler valerie vanessa
vera veronica vicki victor victoria vincent virginia vivian wade wallace walter wanda warren wayne wendy wesley will
william willie wilson yolanda yvonne zachary zoe`.split(/\s+/).filter(Boolean));

function greeting(email: string): string {
  const head = (email.split('@')[0].toLowerCase().split(/[._\-+0-9]/)[0] || '');
  return FIRST_NAMES.has(head) ? head[0].toUpperCase() + head.slice(1) : 'there';
}

/**
 * The opener quotes a product title the scan captured. Titles longer than the
 * capture window arrive cut mid-word, and some stores' first product is a
 * placeholder — both read as sloppy, so drop the name and keep the measurement.
 */
function cleanOpener(finding: string): string | null {
  if (/\[TK Test|Testing Variants/i.test(finding)) return null; // scan hit a test product
  const m = finding.match(/your (.+?) page takes/);
  if (!m) return finding;
  const p = m[1];
  const junk = p.length > 58 || /^(product|home)$/i.test(p) || /[!?]$/.test(p)
    || /tell us|what you think|gift ?card|sample\b/i.test(p);
  return junk ? finding.replace(/your .+? page takes/, 'your product page takes') : finding;
}

export async function POST(req: NextRequest) {
  if (!hasInstantlyKey()) return NextResponse.json({ error: 'INSTANTLY_API_KEY is not set' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const campaignId: string = body.campaignId;
  const minIssues: number = Number(body.minIssues ?? 3);
  const limit: number = Math.min(500, Number(body.limit ?? 200));
  const dryRun: boolean = !!body.dryRun;
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });

  const rows = await prisma.prospect.findMany({
    where: {
      verifyStatus: 'valid', scanStatus: 'scanned', stage: 'new',
      personalInbox: true, issueCount: { gte: minIssues }, finding: { not: null },
    },
    orderBy: [{ issueCount: 'desc' }, { email: 'asc' }],
    take: limit,
    select: { id: true, email: true, storeName: true, domain: true, finding: true, issueCount: true },
  });

  const prepared = rows
    .map((r) => ({ row: r, finding: cleanOpener(r.finding || '') }))
    .filter((x) => x.finding);

  if (dryRun) {
    return NextResponse.json({
      wouldSend: prepared.length,
      skipped: rows.length - prepared.length,
      named: prepared.filter((x) => greeting(x.row.email) !== 'there').length,
      sample: prepared.slice(0, 3).map((x) => ({
        email: x.row.email, firstName: greeting(x.row.email),
        storeName: x.row.storeName || x.row.domain, finding: x.finding, issueCount: x.row.issueCount,
      })),
    });
  }

  let added = 0; const failed: { email: string; error: string }[] = [];
  for (const { row, finding } of prepared) {
    const store = row.storeName || row.domain || 'your store';
    try {
      await addLead({
        campaign: campaignId,
        email: row.email,
        first_name: greeting(row.email),
        company_name: store,
        custom_variables: {
          firstName: greeting(row.email),
          storeName: store,
          finding: finding as string,
          issueCount: String(row.issueCount ?? ''),
        },
      } as Parameters<typeof addLead>[0]);
      await prisma.prospect.update({ where: { id: row.id }, data: { stage: 'queued' } });
      added++;
    } catch (e) {
      failed.push({ email: row.email, error: (e as Error).message.slice(0, 120) });
    }
  }
  return NextResponse.json({ added, failed: failed.length, failures: failed.slice(0, 10), campaignId });
}
