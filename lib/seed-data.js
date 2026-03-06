/**
 * Seed script – populates localStorage with sample property data for testing.
 * Run this once from the browser console or import it in a component.
 *
 * Usage:  import { seedTestData } from '@/lib/seed-data';
 *         seedTestData();
 */

const STORAGE_KEY = 'canvass_properties';

const TEST_PROPERTIES = [
  // ── Lead ──
  { address: '4821 E Cactus Rd, Scottsdale, AZ 85254', lat: 33.5970, lng: -111.9210, year_built: 2001, property_type: 'Single Family', canvass_status: 'lead', notes: 'Homeowner very enthusiastic, wants a quote ASAP.' },
  { address: '1520 W Camelback Rd, Phoenix, AZ 85015', lat: 33.5093, lng: -112.0862, year_built: 1978, property_type: 'Single Family', canvass_status: 'lead', notes: 'Large roof, great candidate. Asked about financing.' },
  { address: '7302 E Indian School Rd, Scottsdale, AZ 85251', lat: 33.4937, lng: -111.9260, year_built: 1985, property_type: 'Single Family', canvass_status: 'lead', notes: 'Wants to schedule an assessment next week.' },
  { address: '9430 E Voltaire Dr, Scottsdale, AZ 85260', lat: 33.5840, lng: -111.8790, year_built: 1994, property_type: 'Single Family', canvass_status: 'lead', notes: 'Very interested, needs to talk to spouse first.' },
  { address: '3828 E Devonshire Ave, Phoenix, AZ 85018', lat: 33.5040, lng: -111.9770, year_built: 1965, property_type: 'Ranch', canvass_status: 'lead', notes: 'Ready to sign, scheduling follow-up.' },

  // ── Not Home ──
  { address: '901 E Chandler Blvd, Chandler, AZ 85225', lat: 33.3062, lng: -111.8320, year_built: 2003, property_type: 'Single Family', canvass_status: 'not_home', notes: 'Knocked twice, car in driveway but no answer.' },
  { address: '1650 S Stapley Dr, Mesa, AZ 85204', lat: 33.3911, lng: -111.8100, year_built: 1988, property_type: 'Single Family', canvass_status: 'not_home', notes: '' },
  { address: '4120 N Brown Ave, Scottsdale, AZ 85251', lat: 33.5020, lng: -111.9240, year_built: 1969, property_type: 'Ranch', canvass_status: 'not_home', notes: 'Will try again on Saturday.' },
  { address: '8834 N 7th St, Phoenix, AZ 85020', lat: 33.5650, lng: -112.0700, year_built: 1972, property_type: 'Single Family', canvass_status: 'not_home', notes: '' },
  { address: '3201 S Gilbert Rd, Gilbert, AZ 85297', lat: 33.3020, lng: -111.7880, year_built: 2012, property_type: 'Single Family', canvass_status: 'not_home', notes: '' },
  { address: '11640 N Tatum Blvd, Phoenix, AZ 85028', lat: 33.5870, lng: -111.9770, year_built: 1996, property_type: 'Patio Home', canvass_status: 'not_home', notes: '' },
  { address: '5050 W Peoria Ave, Glendale, AZ 85302', lat: 33.5810, lng: -112.1530, year_built: 1984, property_type: 'Single Family', canvass_status: 'not_home', notes: '' },
  { address: '2430 S Val Vista Dr, Mesa, AZ 85209', lat: 33.3820, lng: -111.7160, year_built: 2004, property_type: 'Single Family', canvass_status: 'not_home', notes: '' },

  // ── Left Sticky ──
  { address: '3344 N 32nd St, Phoenix, AZ 85018', lat: 33.4830, lng: -111.9867, year_built: 1962, property_type: 'Ranch', canvass_status: 'left_sticky', notes: 'Left sticky note on door with callback number.' },
  { address: '550 W Baseline Rd, Tempe, AZ 85283', lat: 33.3776, lng: -111.9500, year_built: 1990, property_type: 'Single Family', canvass_status: 'left_sticky', notes: 'Left door hanger with info.' },
  { address: '14205 N 51st Ave, Glendale, AZ 85306', lat: 33.6150, lng: -112.1540, year_built: 1995, property_type: 'Single Family', canvass_status: 'left_sticky', notes: 'Neighbor said they work late shifts. Left sticky.' },
  { address: '7620 E McKellips Rd, Scottsdale, AZ 85257', lat: 33.4530, lng: -111.9170, year_built: 1980, property_type: 'Single Family', canvass_status: 'left_sticky', notes: 'Left flyer in door handle.' },

  // ── No Soliciting ──
  { address: '2901 S Rural Rd, Tempe, AZ 85282', lat: 33.3967, lng: -111.9270, year_built: 2005, property_type: 'Condo', canvass_status: 'no_soliciting', notes: 'No soliciting sign on door.' },
  { address: '725 S Power Rd, Mesa, AZ 85206', lat: 33.4029, lng: -111.6730, year_built: 1999, property_type: 'Single Family', canvass_status: 'no_soliciting', notes: 'Gated community, no soliciting policy.' },
  { address: '16420 N 35th Pl, Phoenix, AZ 85032', lat: 33.6390, lng: -111.9920, year_built: 2001, property_type: 'Single Family', canvass_status: 'no_soliciting', notes: 'Sign posted at mailbox.' },

  // ── Not Interested ──
  { address: '19420 N 27th Ave, Phoenix, AZ 85027', lat: 33.6670, lng: -112.1110, year_built: 2010, property_type: 'Single Family', canvass_status: 'not_interested', notes: 'Not the right time financially.' },
  { address: '2140 E University Dr, Mesa, AZ 85213', lat: 33.4217, lng: -111.7880, year_built: 1975, property_type: 'Single Family', canvass_status: 'not_interested', notes: 'Already has solar.' },
  { address: '5225 E Grovers Ave, Scottsdale, AZ 85254', lat: 33.5850, lng: -111.9430, year_built: 1990, property_type: 'Single Family', canvass_status: 'not_interested', notes: 'Said they just re-roofed last year.' },

  // ── Selling ──
  { address: '6340 W Thunderbird Rd, Glendale, AZ 85306', lat: 33.6113, lng: -112.1920, year_built: 1998, property_type: 'Single Family', canvass_status: 'selling', notes: 'For sale sign in yard.' },
  { address: '820 N 54th St, Mesa, AZ 85205', lat: 33.4270, lng: -111.7510, year_built: 1977, property_type: 'Ranch', canvass_status: 'selling', notes: 'Realtor lockbox on door, clearly listed.' },

  // ── Meet Here ──
  { address: '15228 N 40th St, Phoenix, AZ 85032', lat: 33.6260, lng: -111.9980, year_built: 1987, property_type: 'Single Family', canvass_status: 'meet_here', notes: 'Team meet-up point for this neighborhood.' },

  // ── Renting ──
  { address: '1085 W Queen Creek Rd, Chandler, AZ 85248', lat: 33.2590, lng: -111.8520, year_built: 2008, property_type: 'Single Family', canvass_status: 'renting', notes: 'Tenant says they rent, gave landlord info.' },
  { address: '6725 W Indian School Rd, Phoenix, AZ 85033', lat: 33.4940, lng: -112.2050, year_built: 1971, property_type: 'Ranch', canvass_status: 'renting', notes: 'Renter, can\'t make decisions about the property.' },
  { address: '440 W Hermosa Dr, Tempe, AZ 85282', lat: 33.3940, lng: -111.9510, year_built: 1982, property_type: 'Townhome', canvass_status: 'renting', notes: 'College rental. Referred to property management company.' },

  // ── Inaccessible ──
  { address: '10412 W Olive Ave, Peoria, AZ 85345', lat: 33.5610, lng: -112.2410, year_built: 2002, property_type: 'Single Family', canvass_status: 'inaccessible', notes: 'Gated, could not reach door.' },
  { address: '3610 E Baseline Rd, Gilbert, AZ 85234', lat: 33.3781, lng: -111.7510, year_built: 2006, property_type: 'Single Family', canvass_status: 'inaccessible', notes: 'Dog in yard, unsafe to approach.' },
  { address: '4502 E Shea Blvd, Phoenix, AZ 85028', lat: 33.5814, lng: -111.9720, year_built: 1993, property_type: 'Single Family', canvass_status: 'inaccessible', notes: 'Construction fence blocking driveway.' },

  // ── Unknocked (gray — haven't visited yet) ──
  { address: '2210 N Scottsdale Rd, Scottsdale, AZ 85257', lat: 33.4720, lng: -111.9270, year_built: 2003, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '4401 E Hubbell St, Phoenix, AZ 85008', lat: 33.4690, lng: -111.9800, year_built: 1958, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '1833 S Greenfield Rd, Mesa, AZ 85206', lat: 33.3990, lng: -111.7490, year_built: 1997, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '9215 N 14th St, Phoenix, AZ 85020', lat: 33.5720, lng: -112.0570, year_built: 1979, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '3355 W Cactus Rd, Phoenix, AZ 85029', lat: 33.5970, lng: -112.1310, year_built: 1985, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '7110 E Continental Dr, Scottsdale, AZ 85257', lat: 33.4590, lng: -111.9160, year_built: 1972, property_type: 'Ranch', canvass_status: 'unknocked', notes: '' },
  { address: '1025 E Hermosa Dr, Tempe, AZ 85282', lat: 33.3920, lng: -111.9300, year_built: 1966, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '4330 W Caron St, Glendale, AZ 85302', lat: 33.5410, lng: -112.1620, year_built: 1990, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '16808 N 60th Pl, Scottsdale, AZ 85254', lat: 33.6410, lng: -111.9100, year_built: 2005, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '2050 W Baseline Rd, Phoenix, AZ 85041', lat: 33.3780, lng: -112.1010, year_built: 1988, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '840 E Pepper Pl, Mesa, AZ 85203', lat: 33.4340, lng: -111.8170, year_built: 1963, property_type: 'Ranch', canvass_status: 'unknocked', notes: '' },
  { address: '5302 W Campbell Ave, Phoenix, AZ 85031', lat: 33.5080, lng: -112.1590, year_built: 1977, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '18230 N 45th Ave, Glendale, AZ 85308', lat: 33.6530, lng: -112.1570, year_built: 2000, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '1241 E Laguna Dr, Tempe, AZ 85282', lat: 33.3880, lng: -111.9280, year_built: 1974, property_type: 'Townhome', canvass_status: 'unknocked', notes: '' },
  { address: '12430 N 28th Dr, Phoenix, AZ 85029', lat: 33.6020, lng: -112.1130, year_built: 1992, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '6421 S 18th St, Phoenix, AZ 85042', lat: 33.3830, lng: -112.0390, year_built: 2009, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '8702 E Mackenzie Dr, Scottsdale, AZ 85251', lat: 33.4780, lng: -111.8960, year_built: 1970, property_type: 'Ranch', canvass_status: 'unknocked', notes: '' },
  { address: '3920 W Wethersfield Rd, Phoenix, AZ 85029', lat: 33.5650, lng: -112.1440, year_built: 1983, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '1501 N Hayden Rd, Scottsdale, AZ 85257', lat: 33.4640, lng: -111.9090, year_built: 1968, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '5635 W Alice Ave, Glendale, AZ 85302', lat: 33.5130, lng: -112.1780, year_built: 1971, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '2718 E Glenrosa Ave, Phoenix, AZ 85016', lat: 33.5100, lng: -111.9940, year_built: 1955, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '13603 N 51st St, Scottsdale, AZ 85254', lat: 33.6120, lng: -111.9100, year_built: 1998, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '9440 W Elm St, Phoenix, AZ 85037', lat: 33.4610, lng: -112.2600, year_built: 2007, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '4150 E Cactus Rd, Phoenix, AZ 85032', lat: 33.5970, lng: -111.9810, year_built: 1986, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
  { address: '1700 W Southern Ave, Mesa, AZ 85202', lat: 33.3930, lng: -111.8580, year_built: 1975, property_type: 'Single Family', canvass_status: 'unknocked', notes: '' },
];

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function seedTestData() {
  if (typeof window === 'undefined') return;

  const seeded = TEST_PROPERTIES.map((p) => ({
    id: generateId(),
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    year_built: p.year_built,
    property_type: p.property_type,
    canvass_status: p.canvass_status,
    notes: p.notes,
    canvassed_by: p.canvass_status !== 'unknocked' ? 'test-user-001' : '',
    canvassed_at: p.canvass_status !== 'unknocked' ? new Date(Date.now() - Math.random() * 7 * 86400000).toISOString() : null,
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  console.log(`[seed] Loaded ${seeded.length} test properties into localStorage`);
  return seeded.length;
}

export function hasTestData() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && JSON.parse(raw).length > 0;
  } catch {
    return false;
  }
}
