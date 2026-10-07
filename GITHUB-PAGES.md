# GitHub Pages

Կայքի հրապարակումը պատրաստ է `.github/workflows/pages.yml`-ում։ Workflow-ը կառուցում է React հավելվածը՝ Pages-ի ճիշտ base path-ով, ավելացնում պորտֆոլիոն և CV-ն ու հրապարակում `.site-dist`-ը։

## Միացնել մեկ անգամ

1. Բացիր https://github.com/armgasp205-create/armine-portfolio/settings/pages ։
2. Build and deployment → Source բաժնում ընտրիր **GitHub Actions**։
3. Բացիր Actions → Publish portfolio to GitHub Pages։ Եթե նախորդ փորձը ձախողվել է մինչև Pages-ը միացնելը, ընտրիր Run workflow → main → Run workflow։
4. Սպասիր հաջող build/deploy-ին։ Նախատեսված հասցեն՝ https://armgasp205-create.github.io/armine-portfolio/ ։ Մինչ հրապարակումը այն կարող է 404 ցույց տալ։

Հետագա main ճյուղի push-երը ինքնաբերաբար կթարմացնեն կայքը։

## Supabase

Authentication → URL Configuration բաժնում Site URL-ը սահմանիր՝

`https://armgasp205-create.github.io/armine-portfolio/react-planner/`

Redirect URLs-ում ավելացրու նույն հասցեն։ Առանց դրա գրանցման հաստատման հղումը կարող է վերադարձնել հին դոմեն։ Նոր դոմենում բրաուզերի հին տեղային տվյալներն ինքնաբերաբար չեն հայտնվում։

Պաշտոնական քայլերը՝ https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages ։
