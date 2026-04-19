use std::sync::Arc;

use super::amiami::AmiAmiCrawler;
use super::base::ShopCrawler;
use super::cafe24::Cafe24Crawler;
use super::godo::GodoCrawler;
use super::goodsmile::GoodsmileCrawler;
use super::herotime::HerotimeCrawler;
use super::makeshop::MakeshopCrawler;

pub fn get_crawlers() -> Vec<Arc<dyn ShopCrawler>> {
    vec![
        // ── Cafe24 (일반 GET) ─────────────────────────────
        Arc::new(Cafe24Crawler::new(3,  "에스엠라지",     "smlarge.com")),
        Arc::new(Cafe24Crawler::new(4,  "코믹스아트",     "comics-art.co.kr")),
        Arc::new(Cafe24Crawler::new(8,  "도키도키굿즈",   "dokidokigoods.co.kr")),
        Arc::new(Cafe24Crawler::new(10, "매니아하우스",   "maniahouse.co.kr")),
        Arc::new(Cafe24Crawler::new(11, "래빗츠컴퍼니",   "rabbits.kr")),
        Arc::new(Cafe24Crawler::new(13, "따베몰",         "ttabbaemall.co.kr")),
        Arc::new(Cafe24Crawler::new(14, "피규어프레소",   "figurepresso.com")),
        Arc::new(Cafe24Crawler::new(17, "하비다모아",     "hobbydamoa.com")),
        Arc::new(Cafe24Crawler::new(18, "에이에스엘",     "aslmall.com")),
        Arc::new(Cafe24Crawler::new(19, "잇탄스토어",     "ittanstore.com")),
        Arc::new(Cafe24Crawler::new(20, "아이러브토이즈", "ilovetoyz.co.kr")),
        Arc::new(Cafe24Crawler::new(21, "이글루토이",     "iglootoy.com")),
        Arc::new(Cafe24Crawler::new(22, "피규어프렌즈",   "figurefriends.co.kr")),
        // ── Cafe24 (POST + EUC-KR) ────────────────────────
        Arc::new(
            Cafe24Crawler::new(16, "건담붐", "www.gundamboom.com")
                .with_post()
                .with_encoding(encoding_rs::EUC_KR),
        ),
        // ── MakeShop (EUC-KR 기본) ────────────────────────
        Arc::new(MakeshopCrawler::new(23, "건담몰",    "www.gundamall.com")),
        Arc::new(MakeshopCrawler::new(25, "쿄우마샵",  "www.kyoumashop.com")),
        // ── MakeShop (UTF-8) ──────────────────────────────
        Arc::new(MakeshopCrawler::new(24, "하비팩토리", "www.hobbyfactory.kr").with_utf8()),
        Arc::new(MakeshopCrawler::new(27, "피규어몰",   "www.figuremall.co.kr").with_utf8()),
        // ── 고도몰 ────────────────────────────────────────
        Arc::new(GodoCrawler::new(26, "코믹존", "www.comiczone.co.kr")),
        // ── Custom ────────────────────────────────────────
        Arc::new(HerotimeCrawler),
        Arc::new(GoodsmileCrawler),
        Arc::new(AmiAmiCrawler),
    ]
}
