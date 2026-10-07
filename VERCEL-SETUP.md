# Vercel հրապարակում

Նախագիծը պատրաստ է Vercel-ի համար։ `vercel.json`-ը սահմանում է կախվածությունների տեղադրումը, React build-ը և `.site-dist` հրապարակման պանակը։ Այն ներառում է հիմնական պորտֆոլիոն և `/react-planner/` հավելվածը։ Supabase-ի հրապարակային կարգավորումները արդեն կոդում են․ լրացուցիչ environment variables պետք չեն։

1. Բացիր https://vercel.com/signup և ընտրիր անձնական Hobby պլան ու Continue with GitHub։
2. New Project բաժնում ներմուծիր `armgasp205-create/armine-portfolio` նախագիծը։
3. Root Directory-ն թող `./`, Framework Preset-ը՝ Other։ Կարգավորումները կկարդացվեն `vercel.json`-ից։ Սեղմիր Deploy։
4. Հրապարակումից հետո պահիր Vercel-ի տրամադրած production հասցեն։
5. Supabase-ի Authentication → URL Configuration-ում Site URL-ն սահմանիր `https://ՔՈ-ՀԱՍՑԵՆ.vercel.app/react-planner/`, իսկ Redirect URLs-ում ավելացրու նույն հասցեն։ Netlify-ի հասցեն կարող ես պահել Redirect URLs-ում։
6. Նոր հասցեով բացիր `/react-planner/#/account` և փորձիր գրանցում/մուտք, ապա առցանց պահպանումն ու բեռնումը։

Նոր դոմենում հին բրաուզերային տվյալները ինքնաբերաբար չեն հայտնվում․ localStorage-ը կապված է դոմենի հետ։ Հին Netlify տարբերակում առցանց պահպանումը դեռ չկա։ Անհրաժեշտության դեպքում տվյալները կարող ենք տեղափոխել առանձին քայլով։

Պաշտոնական աղբյուրներ՝ [Git նախագիծ ներմուծել](https://vercel.com/docs/git), [vercel.json կարգավորումներ](https://vercel.com/docs/project-configuration/vercel-json)։
