const GOAL_RULES = {
  'Weight loss': {
    supplements: [
      { title: 'Protein powder (whey or plant-based)', detail: 'Helps preserve lean muscle during a calorie deficit. Aim for 0.7–1g of protein per pound of body weight.' },
      { title: 'Green tea extract (EGCG)', detail: 'Mild thermogenic effect; can modestly boost fat oxidation. 400–500 mg/day with meals.' },
      { title: 'Psyllium husk (soluble fiber)', detail: 'Increases satiety and supports gut health. Take 5–10g before meals with plenty of water.' },
    ],
    workouts: [
      { title: 'Zone 2 cardio 4–5x/week', detail: '30–45 minutes at a moderate, conversational pace (brisk walk, cycling, swimming) — effective fat-burning zone with high sustainability.' },
      { title: 'Resistance training 2–3x/week', detail: 'Preserves and builds muscle, which raises resting metabolic rate. Full-body or upper/lower splits work well.' },
      { title: 'Increase daily NEAT movement', detail: 'Non-exercise activity (steps, standing, stairs) accounts for a large share of daily calorie burn. Target 8,000–10,000 steps/day.' },
    ],
    diet: [
      { title: 'Caloric deficit of 300–500 kcal/day', detail: 'Sustainable deficit for 0.5–1 lb/week loss without excessive muscle loss.' },
      { title: 'Prioritize protein and fiber at every meal', detail: 'Lean meats, legumes, eggs, and vegetables are filling per calorie. Hit protein first, fiber second.' },
      { title: 'Limit ultra-processed foods and liquid calories', detail: 'Sodas, juices, alcohol, and packaged snacks are easy sources of hidden calories with low satiety.' },
      { title: 'Eat slowly and stop at 80% full', detail: 'Satiety signals take ~20 minutes to reach the brain; slowing down naturally reduces intake without counting calories.' },
    ],
    lifestyle: [
      { title: 'Sleep 7–9 hours', detail: 'Sleep deprivation raises ghrelin (hunger hormone) and lowers leptin (fullness hormone) — directly undermining weight loss.' },
      { title: 'Track food for 2–4 weeks', detail: 'Even short-term food journaling dramatically improves dietary awareness. You don\'t need to log forever.' },
      { title: 'Manage stress proactively', detail: 'Chronic stress elevates cortisol, which promotes fat storage especially around the abdomen.' },
    ],
  },

  'Muscle gain / weight gain': {
    supplements: [
      { title: 'Creatine monohydrate', detail: '5g/day consistently — the most evidence-backed supplement for muscle gain and strength. No loading phase needed.' },
      { title: 'Protein powder', detail: 'Convenient way to hit higher protein targets. Aim for 0.7–1g per pound of body weight per day.' },
      { title: 'Mass gainer (only if needed)', detail: 'Only useful if you consistently struggle to eat enough calories. Check for excessive sugar content.' },
    ],
    workouts: [
      { title: 'Progressive overload resistance training 3–5x/week', detail: 'Systematically increase weight or reps each week. Compound lifts (squat, deadlift, bench, row, overhead press) drive the most growth.' },
      { title: 'Limit excessive cardio', detail: 'Keep cardio moderate (2–3x/week) to avoid burning through the caloric surplus needed for muscle gain.' },
      { title: 'Focus on compound movements', detail: 'Multi-joint exercises recruit the most muscle and produce the strongest anabolic stimulus.' },
    ],
    diet: [
      { title: 'Caloric surplus of 250–500 kcal/day', detail: 'Modest surplus minimizes fat gain while supporting muscle growth. Track weight weekly to confirm the trend.' },
      { title: 'High protein — 0.8–1g per pound of body weight', detail: 'Spread across 3–4 meals. Each meal should contain at least 30–40g of protein to maximally stimulate muscle protein synthesis.' },
      { title: 'Nutrient-dense calorie sources', detail: 'Whole grains, nuts, avocado, olive oil, eggs, and fatty fish are calorie-dense without displacing nutrients.' },
      { title: 'Protein + carb meal within 1–2 hours of training', detail: 'A peri-workout meal supports muscle protein synthesis and replenishes glycogen.' },
    ],
    lifestyle: [
      { title: 'Sleep 7–9 hours (non-negotiable)', detail: 'Growth hormone is released primarily during deep sleep — essential for muscle repair and growth.' },
      { title: 'Be patient: muscle gain is slow', detail: 'Natural muscle gain is 0.5–1 lb/month for intermediate trainees. Consistency over months matters more than any single variable.' },
    ],
  },

  'Improve cardiovascular fitness': {
    supplements: [
      { title: 'Beetroot / nitrate supplement', detail: 'Increases nitric oxide, improving oxygen delivery to muscles. ~500 mg nitrate 2 hours before cardio sessions.' },
      { title: 'Electrolytes', detail: 'Sodium, potassium, and magnesium prevent cramping and support performance in longer sessions, especially if sweating heavily.' },
      { title: 'Beta-alanine (optional)', detail: 'Buffers lactic acid during high-intensity efforts. 3.2–6.4g/day; tingling (paresthesia) is a harmless known side effect.' },
    ],
    workouts: [
      { title: 'Zone 2 base training 3–4x/week', detail: '30–60 minutes at a conversational pace builds mitochondrial density and aerobic base — the foundation of cardiovascular fitness.' },
      { title: 'Interval training 1–2x/week', detail: 'Short high-intensity intervals (e.g. 4×4 minutes at hard effort) drive VO₂max adaptations quickly.' },
      { title: 'Build gradually — 10% per week rule', detail: 'Increase weekly training volume no more than 10% per week to avoid overuse injuries.' },
    ],
    diet: [
      { title: 'Carbohydrate-rich meals before longer sessions', detail: 'Carbs are the primary fuel for aerobic exercise. Oats, rice, or fruit 1–2 hours before is effective.' },
      { title: 'Stay well-hydrated throughout the day', detail: 'Even 1–2% dehydration meaningfully reduces endurance performance.' },
      { title: 'Anti-inflammatory foods', detail: 'Fatty fish, berries, leafy greens, and olive oil support cardiovascular recovery and long-term heart health.' },
    ],
    lifestyle: [
      { title: 'Track resting heart rate', detail: 'A declining resting heart rate over weeks is one of the clearest markers of improving cardiovascular fitness.' },
      { title: 'Prioritize recovery days', detail: 'Adaptations happen during rest. At least 1–2 full rest days per week are essential for cardiovascular improvement.' },
    ],
  },

  'Build strength': {
    supplements: [
      { title: 'Creatine monohydrate', detail: '5g/day — the single most evidence-backed supplement for strength gains. Improves ATP regeneration during heavy lifts.' },
      { title: 'Protein powder', detail: 'Convenient for hitting daily protein targets. Strength training increases protein needs to 0.7–1g/lb body weight.' },
      { title: 'Caffeine (pre-workout)', detail: '3–6 mg/kg body weight 30–60 min before training improves strength output. Coffee works as well as commercial pre-workouts.' },
    ],
    workouts: [
      { title: 'Run a structured strength program 3–5x/week', detail: 'Proven programs (Starting Strength, StrongLifts, GZCLP) take the guesswork out. Core lifts: squat, deadlift, bench press, overhead press, barbell row.' },
      { title: 'Progressive overload with a training log', detail: 'Add weight systematically — even 2.5 lbs/session on upper body lifts. If you\'re not logging, you\'re guessing.' },
      { title: 'Leave 1–3 reps in reserve on main lifts', detail: 'Training near failure (not to failure) on compound lifts optimizes strength adaptations while managing recovery demands.' },
    ],
    diet: [
      { title: 'Adequate protein — 0.7–1g per pound of body weight', detail: 'Distribute across 3–4 meals for optimal muscle protein synthesis throughout the day.' },
      { title: 'Eat at or slightly above maintenance calories', detail: 'Strength gains are significantly blunted in a sustained calorie deficit. Don\'t under-eat.' },
      { title: 'Carbohydrates around training', detail: 'Glycogen fuels strength work. A carb-rich meal 1–2 hours before heavy sessions improves performance measurably.' },
    ],
    lifestyle: [
      { title: 'Sleep 7–9 hours consistently', detail: 'Strength peaks and troughs track closely with sleep quality. One poor night measurably reduces next-day performance.' },
      { title: 'Deload every 4–6 weeks', detail: 'Planned light weeks allow connective tissue and the CNS to recover — preventing stalls and injuries.' },
      { title: 'Warm up properly', detail: '5–10 min light cardio + progressive warm-up sets (50%/70%/90% of working weight) reduce injury risk and improve session performance.' },
    ],
  },

  'Lower blood pressure': {
    supplements: [
      { title: 'Magnesium glycinate', detail: '200–400 mg/day. Magnesium relaxes blood vessel walls; deficiency is common and linked to elevated blood pressure.' },
      { title: 'Potassium (via food, not supplements)', detail: 'Potassium counteracts sodium\'s pressure-raising effect. Aim for 3,500–5,000 mg/day from food: bananas, sweet potato, avocado, spinach. Supplement only if prescribed.' },
      { title: 'CoQ10', detail: '100–200 mg/day has modest evidence for modest BP reduction as an adjunct — not a replacement for medication.' },
    ],
    workouts: [
      { title: 'Aerobic exercise 30 min, 5x/week', detail: 'Regular moderate-intensity cardio is one of the most effective lifestyle interventions for hypertension — can reduce systolic by 5–8 mmHg.' },
      { title: 'Resistance training 2–3x/week', detail: 'Moderate resistance training also lowers BP over time. Avoid prolonged breath-holding (Valsalva maneuver) during heavy lifts.' },
      { title: 'Avoid high-intensity isometric holds', detail: 'Heavy planks, wall sits, and isometric exercises acutely spike blood pressure. Prefer dynamic, rhythmic movements.' },
    ],
    diet: [
      { title: 'DASH diet pattern', detail: 'Dietary Approaches to Stop Hypertension: rich in fruits, vegetables, whole grains, low-fat dairy, lean protein. Can reduce systolic by 8–14 mmHg.' },
      { title: 'Limit sodium to <2,300 mg/day', detail: 'Watch canned soups, deli meats, restaurant food, soy sauce, and condiments — the biggest hidden sodium sources.' },
      { title: 'Limit alcohol to <7 drinks/week', detail: 'More than 1–2 drinks/day consistently raises blood pressure. Alcohol is a significant contributor that\'s often overlooked.' },
      { title: '8–10 servings of fruits and vegetables daily', detail: 'High potassium and antioxidant content actively counteracts elevated blood pressure.' },
    ],
    lifestyle: [
      { title: 'Monitor blood pressure at home daily', detail: 'Measure at the same time each day after sitting quietly for 5 minutes. Consistent home monitoring catches trends before they become crises.' },
      { title: 'Reduce chronic stress', detail: 'Chronic psychological stress directly elevates blood pressure. Breathing exercises, mindfulness, and adequate rest all have measurable effects.' },
      { title: 'Lose weight if overweight', detail: 'Each 2.2 lbs (1 kg) of weight loss reduces systolic BP by roughly 1 mmHg on average.' },
      { title: 'Quit smoking', detail: 'Nicotine causes acute BP spikes and long-term cardiovascular damage. The highest-impact lifestyle change for cardiovascular risk.' },
    ],
  },

  'Lower cholesterol': {
    supplements: [
      { title: 'Omega-3 fatty acids (fish oil)', detail: '2–4g/day of EPA+DHA lowers triglycerides significantly. Prescription-strength EPA (4g) can reduce triglycerides by 20–30%.' },
      { title: 'Psyllium husk (soluble fiber)', detail: '5–10g/day binds cholesterol in the gut, reducing LDL by 5–10%. Take with plenty of water before meals.' },
      { title: 'Berberine', detail: '500 mg 2–3x/day has evidence for modest LDL and triglyceride reduction comparable to some medications. Check for interactions.' },
    ],
    workouts: [
      { title: 'Aerobic exercise 30–60 min, 4–5x/week', detail: 'Regular cardio raises HDL ("good" cholesterol) and improves the LDL particle profile.' },
      { title: 'Resistance training 2–3x/week', detail: 'Adds to cardio\'s lipid benefits and improves insulin sensitivity, which is closely linked to cholesterol metabolism.' },
    ],
    diet: [
      { title: 'Replace saturated fat with unsaturated fat', detail: 'Swap butter and red meat for olive oil, avocado, nuts, and fatty fish. The single most impactful dietary change for LDL.' },
      { title: 'Increase soluble fiber to 25–30g/day', detail: 'Oats, barley, legumes, apples, and psyllium husk all actively pull LDL from circulation.' },
      { title: 'Eliminate trans fats', detail: 'Partially hydrogenated oils (found in some packaged foods) raise LDL and lower HDL simultaneously — avoid completely.' },
      { title: 'Limit dietary cholesterol modestly', detail: 'Eggs and shellfish in moderation are fine for most people; saturated fat has greater impact on blood cholesterol than dietary cholesterol.' },
    ],
    lifestyle: [
      { title: 'Quit smoking', detail: 'Smoking lowers HDL and oxidizes LDL particles, accelerating atherosclerosis.' },
      { title: 'Limit alcohol', detail: 'Heavy drinking significantly raises triglycerides. Keep to ≤1–2 drinks/day maximum.' },
      { title: 'Lose excess weight', detail: 'Even 5–10% body weight loss measurably improves all lipid markers.' },
    ],
  },

  'Manage blood sugar': {
    supplements: [
      { title: 'Berberine', detail: '500 mg with meals, up to 3x/day. Evidence is strong for improving blood sugar and insulin sensitivity. Discuss with your doctor — risk of hypoglycemia with some diabetes medications.' },
      { title: 'Magnesium glycinate', detail: '200–400 mg/day. Magnesium plays a key role in insulin signaling and is commonly deficient in people with type 2 diabetes.' },
      { title: 'Alpha-lipoic acid', detail: '300–600 mg/day. Antioxidant that improves insulin sensitivity and reduces diabetic neuropathy symptoms.' },
    ],
    workouts: [
      { title: '10–15 min walk after every meal', detail: 'One of the most effective tools for blunting post-meal blood glucose spikes — even a short walk makes a measurable difference.' },
      { title: 'Resistance training 3x/week', detail: 'Muscle is the primary site of glucose disposal. Building muscle dramatically improves long-term insulin sensitivity.' },
      { title: 'Zone 2 cardio 3–4x/week', detail: '30–45 minutes of moderate aerobic exercise consistently improves A1c and insulin sensitivity over weeks.' },
    ],
    diet: [
      { title: 'Choose low glycemic index carbohydrates', detail: 'Legumes, non-starchy vegetables, whole grains, and berries over white bread, white rice, and sugary drinks.' },
      { title: 'Eat protein and fat before carbohydrates at each meal', detail: 'Food order matters: protein and fat first significantly blunts the subsequent glucose spike from carbs at the same meal.' },
      { title: 'Eliminate liquid sugar', detail: 'Sodas, juice, sweetened coffee, and energy drinks cause the sharpest glucose spikes. This is the highest-priority dietary change.' },
      { title: 'Consistent meal timing', detail: 'Eating at the same times each day helps regulate circadian blood glucose rhythms and improves insulin response.' },
    ],
    lifestyle: [
      { title: 'Monitor blood glucose regularly', detail: 'Regular monitoring (fasting + post-meal) gives direct feedback on which foods and habits affect your glucose most.' },
      { title: 'Fix sleep quality', detail: 'Even one night of poor sleep significantly worsens insulin resistance the next day. Sleep and blood sugar are tightly linked.' },
      { title: 'Manage stress', detail: 'Cortisol raises blood glucose directly. Breathwork, mindfulness, and adequate rest are legitimate metabolic interventions.' },
    ],
  },

  'Improve sleep': {
    supplements: [
      { title: 'Magnesium glycinate', detail: '300–400 mg taken 30–60 min before bed. Promotes muscle relaxation and GABA activity, facilitating sleep onset.' },
      { title: 'Low-dose melatonin (0.5–1 mg)', detail: 'Effective for resetting sleep timing, especially for shift work or irregular schedules. Lower doses work as well as high doses for most people.' },
      { title: 'L-theanine', detail: '100–200 mg before bed. Promotes calm relaxation without morning grogginess; pairs well with magnesium.' },
    ],
    workouts: [
      { title: 'Regular exercise, finished 3+ hours before bed', detail: 'Regular exercise significantly improves sleep quality. Vigorous training close to bedtime delays sleep onset for many people.' },
      { title: 'Morning outdoor light exposure', detail: 'Bright outdoor light in the morning anchors the circadian clock, making it easier to fall asleep at night.' },
      { title: 'Evening stretching or yoga', detail: 'Gentle movement in the evening is an effective wind-down and does not interfere with sleep the way vigorous exercise does.' },
    ],
    diet: [
      { title: 'Avoid caffeine after 1–2 pm', detail: 'Caffeine\'s half-life is 5–7 hours. An afternoon coffee at 2 pm still has meaningful caffeine activity at 9 pm bedtime for many people.' },
      { title: 'Limit alcohol before bed', detail: 'Alcohol helps you fall asleep but fragments sleep in the second half of the night, significantly reducing sleep quality and REM.' },
      { title: 'Light dinner, not within 2 hours of bedtime', detail: 'Large meals close to bed can disrupt sleep via digestion and reflux. A small, low-glycemic snack if hungry is fine.' },
    ],
    lifestyle: [
      { title: 'Consistent sleep/wake times (including weekends)', detail: 'The single most impactful sleep habit. Irregular schedules disrupt circadian rhythms severely and cause "social jet lag."' },
      { title: 'Cool, dark, quiet room (65–68°F / 18–20°C)', detail: 'Temperature is one of the strongest environmental triggers for sleep. Blackout curtains and white noise help significantly.' },
      { title: 'Screen-free wind-down 1 hour before bed', detail: 'Blue light and stimulating content delay melatonin release. Replace with reading, stretching, journaling, or calm music.' },
      { title: 'Reserve the bed for sleep only', detail: 'Working, scrolling, or watching TV in bed trains the brain to be alert in bed. Keep it exclusively for sleep.' },
    ],
  },

  'Reduce stress': {
    supplements: [
      { title: 'Ashwagandha (KSM-66 extract)', detail: '300–600 mg/day. Adaptogen with strong clinical evidence for reducing cortisol, perceived stress, and anxiety. Morning or evening dosing.' },
      { title: 'Magnesium glycinate', detail: '200–400 mg/day. Supports the nervous system and is commonly depleted during periods of chronic stress.' },
      { title: 'L-theanine', detail: '100–200 mg during the day. Promotes relaxed alertness without sedation; pairs well with caffeine to reduce its jitteriness.' },
    ],
    workouts: [
      { title: 'Vigorous aerobic exercise 30–45 min, 3–5x/week', detail: 'One of the most effective stress and anxiety interventions available — lowers cortisol and produces endorphins that last hours post-session.' },
      { title: 'Yoga or mindful movement 2–3x/week', detail: 'Combines physical activity with breath focus, directly activating the parasympathetic nervous system.' },
      { title: 'Nature walks', detail: 'Outdoor walks in green spaces reliably lower cortisol and improve mood beyond what indoor exercise alone achieves.' },
    ],
    diet: [
      { title: 'Stabilize blood sugar with regular meals', detail: 'Blood sugar swings trigger a stress-response cascade. Consistent, balanced meals prevent unnecessary physiological stress.' },
      { title: 'Limit caffeine and alcohol', detail: 'Both can worsen anxiety and disrupt the sleep that stress recovery depends on.' },
      { title: 'Omega-3 rich foods', detail: 'Fatty fish, walnuts, and flaxseed reduce systemic inflammation that is amplified and worsened by chronic stress.' },
    ],
    lifestyle: [
      { title: 'Daily breathwork (5 min minimum)', detail: 'Box breathing (4 in / 4 hold / 4 out / 4 hold) or physiological sigh (double inhale + long exhale) immediately activates the parasympathetic nervous system. No equipment needed.' },
      { title: 'Protect sleep as a priority', detail: 'Stress and poor sleep form a vicious cycle. Treating sleep as non-negotiable is the fastest way to break it.' },
      { title: 'Set 20–30 min/day of non-digital recovery time', detail: 'No screens, no to-do lists, no news. Reading, walking, a hobby — anything that isn\'t consuming digital content.' },
      { title: 'Invest in social connection', detail: 'Strong social ties are among the most powerful buffers against chronic stress. Prioritize face-to-face time with people you value.' },
    ],
  },

  'Increase energy': {
    supplements: [
      { title: 'Vitamin D3 + K2', detail: 'Deficiency is extremely common and strongly linked to fatigue. 2,000–5,000 IU D3 + 100 mcg K2 daily. Get levels tested if possible.' },
      { title: 'B-complex (methylated form)', detail: 'B12 and folate deficiencies are common causes of fatigue, especially in older adults, vegetarians, and those on metformin. Choose methylcobalamin over cyanocobalamin.' },
      { title: 'Iron (only if confirmed deficient)', detail: 'Iron deficiency is a leading cause of fatigue, especially in women. Test serum ferritin first — do not supplement iron without a confirmed deficiency.' },
      { title: 'CoQ10', detail: '100–200 mg/day supports cellular energy production (ATP). Particularly relevant if you are on a statin medication, which depletes CoQ10.' },
    ],
    workouts: [
      { title: 'Regular moderate exercise (increases energy paradoxically)', detail: 'Sedentary fatigue is broken by movement, not more rest. Start with 20–30 min daily walks and build from there.' },
      { title: 'Morning movement routine', detail: 'Even 10 minutes of light exercise in the morning raises cortisol appropriately, increases alertness, and sets positive energy tone for the day.' },
    ],
    diet: [
      { title: 'Eat regular, balanced meals — don\'t skip', detail: 'Skipping meals or eating erratically causes blood sugar crashes that feel like profound fatigue. Consistent meal timing stabilizes energy.' },
      { title: 'Prioritize complex carbs and protein, cut refined sugar', detail: 'Replace white bread and sugary snacks with oats, legumes, and vegetables for sustained energy instead of spikes and crashes.' },
      { title: 'Drink 2–3L of water daily', detail: 'Mild dehydration (1–2%) is one of the most common yet overlooked causes of daytime fatigue and poor concentration.' },
    ],
    lifestyle: [
      { title: 'Rule out medical causes first', detail: 'Persistent fatigue can stem from thyroid issues, anemia, sleep apnea, depression, or medication side effects. Worth a checkup if fatigue is new or worsening.' },
      { title: 'Fix sleep before adding supplements', detail: 'No supplement compensates for chronic sleep deprivation. 7–9 hours is the foundation; nothing else works well without it.' },
      { title: 'Manage your energy with your biology, not against it', detail: 'Schedule demanding tasks during your natural peak alertness window (typically mid-morning for most people) and protect that time.' },
    ],
  },

  'General wellness': {
    supplements: [
      { title: 'High-quality multivitamin', detail: 'Fills common dietary gaps. Look for one with methylated B vitamins (methylfolate, methylcobalamin), adequate D3, and without excessive megadoses.' },
      { title: 'Vitamin D3 + K2', detail: 'Most people are deficient. 2,000 IU D3 + 100 mcg K2 daily is a safe, impactful starting point.' },
      { title: 'Omega-3 fatty acids (EPA + DHA)', detail: '1–2g/day. Anti-inflammatory, cardiovascular-protective, supports brain health and mood.' },
      { title: 'Magnesium glycinate', detail: '200–400 mg/day. The most commonly deficient mineral; supports hundreds of enzymatic reactions and reduces muscle tension.' },
    ],
    workouts: [
      { title: '150 min/week of moderate aerobic activity', detail: 'The WHO evidence-based minimum for meaningful health outcomes. Walking, cycling, swimming — any activity you\'ll sustain.' },
      { title: 'Resistance training 2x/week', detail: 'Preserves muscle mass, bone density, and metabolic rate as you age. The single best predictor of functional quality of life at 70 and beyond.' },
      { title: 'Flexibility and mobility work', detail: '10 minutes of stretching or yoga 3x/week reduces injury risk and maintains range of motion that\'s hard to regain if lost.' },
    ],
    diet: [
      { title: 'Mediterranean-style eating pattern', detail: 'Consistently top-rated in longevity research: olive oil, fish, legumes, vegetables, whole grains. Modest red meat, minimal ultra-processed food.' },
      { title: 'Eat 30+ different plants per week', detail: 'Plant diversity is the strongest predictor of a healthy gut microbiome. Counts: vegetables, fruits, whole grains, legumes, nuts, seeds, herbs, spices.' },
      { title: 'Minimize ultra-processed foods', detail: 'If only one dietary change — this is it. Ultra-processed foods are independently associated with virtually every major chronic disease.' },
    ],
    lifestyle: [
      { title: 'Sleep 7–9 hours consistently', detail: 'Sleep is when the brain clears metabolic waste, muscles repair, and hormones reset. No supplement or habit compensates for chronic sleep debt.' },
      { title: 'Invest in strong social relationships', detail: 'Social connection is one of the strongest documented predictors of longevity and mental health — on par with not smoking in the research.' },
      { title: 'Stay current on preventive screenings', detail: 'Bloodwork, colonoscopy, skin checks, dental care — stay up to date on age-appropriate preventive care.' },
      { title: 'Manage chronic stress proactively', detail: 'Unmanaged chronic stress accelerates cellular aging (telomere shortening) and is a direct risk factor for most chronic diseases.' },
    ],
  },
};

function matches(text, ...keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function buildCautions({ conditions, medications, allergies }) {
  const cautions = [];

  const hasCond = (...kw) => conditions.some((c) => matches(c.name, ...kw));
  const hasMed = (...kw) => medications.some((m) => matches(m.name, ...kw));
  const hasAllergy = (...kw) => allergies.some((a) => matches(a.allergen, ...kw));

  if (hasMed('warfarin', 'coumadin', 'eliquis', 'xarelto', 'pradaxa', 'apixaban', 'rivaroxaban', 'dabigatran')) {
    cautions.push('⚠️ Blood thinner detected: Avoid high-dose fish oil, vitamin E, ginkgo biloba, garlic supplements, and sudden vitamin K changes without discussing with your prescriber — all affect clotting risk.');
  }

  if (hasCond('diabetes', 'blood sugar', 'insulin resistance', 'pre-diabet') || hasMed('metformin', 'insulin', 'glipizide', 'glyburide', 'jardiance', 'ozempic', 'semaglutide', 'trulicity', 'januvia', 'glimepiride')) {
    cautions.push('⚠️ Diabetes / blood sugar medication detected: Berberine, alpha-lipoic acid, and chromium can lower blood glucose — discuss with your doctor before adding these to avoid hypoglycemia, especially if you are on insulin or a sulfonylurea.');
  }

  if (hasMed('statin', 'atorvastatin', 'rosuvastatin', 'simvastatin', 'lovastatin', 'pravastatin', 'lipitor', 'crestor', 'zocor')) {
    cautions.push('⚠️ Statin medication detected: CoQ10 supplementation is particularly relevant for you — statins deplete CoQ10. Avoid red yeast rice (it contains the same active compound as statins). Avoid grapefruit with most statins.');
  }

  if (hasMed('ssri', 'snri', 'sertraline', 'zoloft', 'fluoxetine', 'prozac', 'escitalopram', 'lexapro', 'citalopram', 'celexa', 'paroxetine', 'paxil', 'venlafaxine', 'effexor', 'duloxetine', 'cymbalta')) {
    cautions.push('⚠️ Antidepressant (SSRI/SNRI) detected: Do NOT take St. John\'s Wort — it can cause serotonin syndrome when combined with SSRIs/SNRIs. High-dose 5-HTP and tryptophan also carry serotonin syndrome risk.');
  }

  if (hasCond('kidney', 'renal', 'ckd')) {
    cautions.push('⚠️ Kidney condition detected: High-protein diets may accelerate kidney decline — stay within your nephrologist\'s protein targets. Avoid potassium and magnesium supplements without lab-confirmed deficiency. Creatine use should be cleared with your nephrologist first.');
  }

  if (hasCond('heart disease', 'heart failure', 'coronary', 'artery disease', 'angina', 'heart attack', 'myocardial')) {
    cautions.push('⚠️ Heart condition detected: Consult your cardiologist before starting a new exercise program or adding supplements. Begin with supervised, low-to-moderate intensity exercise. Avoid high-intensity work until cleared.');
  }

  if (hasCond('hypertension', 'high blood pressure') || hasMed('lisinopril', 'amlodipine', 'metoprolol', 'losartan', 'hydrochlorothiazide', 'hctz')) {
    cautions.push('⚠️ High blood pressure noted: Avoid stimulant-heavy pre-workout supplements (high-dose caffeine, synephrine, yohimbine). Licorice root raises blood pressure — skip it. Monitor BP before and after starting new exercise or supplement routines.');
  }

  if (hasCond('pregnan', 'prenatal') || hasMed('prenatal')) {
    cautions.push('⚠️ Pregnancy noted: Review all supplement changes with your OB before starting. Typically only prenatal vitamins with methylfolate, iron, and DHA are advised. Avoid herbal adaptogens, fat-loss strategies, and high-intensity exercise not already established.');
  }

  if (hasAllergy('shellfish', 'shrimp', 'crab', 'lobster', 'oyster')) {
    cautions.push('⚠️ Shellfish allergy: Glucosamine supplements are often shellfish-derived — use plant-based or synthetic glucosamine, or avoid. Some fish oil products may carry shellfish cross-contamination risk; read labels carefully.');
  }

  if (hasAllergy('fish', 'salmon', 'tuna', 'mackerel', 'sardine', 'anchovy')) {
    cautions.push('⚠️ Fish allergy: Avoid fish oil and krill oil supplements. Use algae-based omega-3 (algal DHA/EPA) instead — it is the original source fish accumulate omega-3s from and is equally effective.');
  }

  if (hasAllergy('soy')) {
    cautions.push('⚠️ Soy allergy: Avoid soy protein powders and check all protein supplements and bars for soy-derived ingredients.');
  }

  if (hasAllergy('dairy', 'lactose', 'milk', 'whey', 'casein')) {
    cautions.push('⚠️ Dairy / lactose sensitivity: Choose plant-based protein powders (pea + rice blend, hemp) instead of whey or casein. Confirm any protein supplement is certified dairy-free.');
  }

  if (hasAllergy('gluten', 'wheat', 'celiac', 'barley', 'rye')) {
    cautions.push('⚠️ Gluten sensitivity / celiac: Confirm any protein powder, fiber supplement, or packaged food is certified gluten-free. Oats (recommended for cholesterol) must be certified gluten-free for celiac disease.');
  }

  if (hasAllergy('nut', 'peanut', 'tree nut', 'almond', 'cashew', 'walnut', 'pecan', 'pistachio')) {
    cautions.push('⚠️ Nut allergy: Recommendations involving nuts are not appropriate for you. Substitute seeds (sunflower, pumpkin, hemp) for similar nutritional profiles.');
  }

  return cautions;
}

export function generateRecommendations({ profile, goals, conditions, medications, allergies }) {
  const cautions = buildCautions({ conditions, medications, allergies });

  const seen = new Set();
  const categories = { supplements: [], workouts: [], diet: [], lifestyle: [] };

  for (const goal of goals) {
    const rules = GOAL_RULES[goal.goal_type];
    if (!rules) continue;
    for (const cat of ['supplements', 'workouts', 'diet', 'lifestyle']) {
      for (const item of rules[cat] || []) {
        if (!seen.has(item.title)) {
          seen.add(item.title);
          categories[cat].push(item);
        }
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    based_on: {
      goals: goals.map((g) => g.goal_type),
      condition_count: conditions.length,
      medication_count: medications.length,
    },
    cautions,
    categories,
    disclaimer:
      'These suggestions are for general informational purposes only and are not medical advice. They are generated by a rule-based system and cannot account for all individual factors. Always consult a qualified healthcare provider, dietitian, or personal trainer before starting new supplements, diets, or exercise programs — especially given your existing conditions and medications.',
  };
}
