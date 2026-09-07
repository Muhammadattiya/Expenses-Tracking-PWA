# Egyptian SMS Test Matrix

| SMS Pattern | Source | Raw Merchant | Normalized | Intent | Category | Pass |
|---|---|---|---|---|---|---|
| Your Debit Card **1984 had a S... | UNKNOWN | Top Up ETISALAT Egypt | TOP UP ETISALAT | null | NULL | ✅ |
| تم خصم مبلغ 60.01 جم لحظيا باس... | SEMANTIC_KEYWORD | Mobile Recharge | MOBILE RECHARGE | phone | phone | ✅ |
| IPN transfer sent with amount ... | SEMANTIC_KEYWORD | IPN Transfer | IPN TRANSFER | transfer | transfer | ✅ |
| تم تنفيذ تحويل لحظي من بطاقتكم... | UNKNOWN | سيف م**** ا*** س*** ا*** ز** | سيف م**** ا*** س*** ا*** ز** | null | NULL | ✅ |
| تم خصم 404.7 EGP من بطاقة المد... | SEMANTIC_KEYWORD | PAYMOB*LIMBO CAFE C | LIMBO CAFE C | coffee | coffee | ✅ |
| 300 L.E were successfully tran... | UNKNOWN | 01223212038 | 01223212038 | null | NULL | ✅ |
| 140 L.E was successfully recha... | SEMANTIC_KEYWORD | Mobile Recharge | MOBILE RECHARGE | phone | phone | ✅ |
| تم دفع مبلغ 480.0جنية لSwvl. ر... | GLOBAL_MERCHANT | Swvl | SWVL | transportation | transportation | ✅ |
| تم سحب 1000.00 جنية من محفظة ف... | SEMANTIC_KEYWORD | Withdrawal | WITHDRAWAL | cash_withdrawal | cash_withdrawal | ✅ |
| تم خصم 95.50 EGP من حسابك 1000... | UNKNOWN | ADIB Transaction | ADIB TRANSACTION | null | NULL | ✅ |
| Your account ending in 9596 ha... | SEMANTIC_KEYWORD | IPN Transfer | IPN TRANSFER | transfer | transfer | ✅ |
| تم خصم 8008.00 EGP من حسابك 10... | UNKNOWN | ADIB Transaction | ADIB TRANSACTION | null | NULL | ✅ |
| Your account ending in 9596 ha... | SEMANTIC_KEYWORD | IPN Transfer | IPN TRANSFER | transfer | transfer | ✅ |
| شكرًا لاستخدامك بطاقة بنك مصر ... | UNKNOWN | FAWRYPF*HANA MARKETSQAL | HANA MARKETSQAL | null | NULL | ✅ |
| تم تحويل مبلغ 6650EGP من حساب ... | SEMANTIC_KEYWORD | IPN Transfer | IPN TRANSFER | transfer | transfer | ✅ |
| تم إضافة تحويل لحظي لبطاقتكم م... | UNKNOWN | سيف مصطفى احمد سامى احمد زيد | سيف مصطفى احمد سامى احمد زيد | null | NULL | ✅ |
| IPN transfer received with amo... | SEMANTIC_KEYWORD | IPN Transfer | IPN TRANSFER | transfer | transfer | ✅ |
| تم اضافة مبلغ 20000EGP الى حسا... | SEMANTIC_KEYWORD | IPN Transfer | IPN TRANSFER | transfer | transfer | ✅ |
| عميلنا العزيز, نوجه عناية سياد... | SEMANTIC_KEYWORD | ADIB Income | ADIB INCOME | salary | salary | ✅ |
| عميلنا العزيز, نوجه عناية سياد... | SEMANTIC_KEYWORD | ADIB Income | ADIB INCOME | salary | salary | ✅ |
| تم استلام مبلغ 450.00 جنيه من ... | UNKNOWN | AHMED MOHAMED HASANEIN YOUSSEF | AHMED MOHAMED HASANEIN YOUSSEF | null | NULL | ✅ |
| Successful transaction of EGP ... | UNKNOWN | null |  | null | NULL | ✅ |
| Successful transaction of EGP ... | UNKNOWN | null |  | null | NULL | ✅ |
| Successful transaction of EGP ... | UNKNOWN | null |  | null | NULL | ✅ |
| Successful transaction of EGP ... | UNKNOWN | null |  | null | NULL | ✅ |
| Transaction amount 1984 EGP... | UNKNOWN | Unrecognized SMS |  | null | NULL | ✅ |
| Successful transaction of EGP ... | UNKNOWN | null |  | null | NULL | ✅ |
| تم خصم مبلغ 300 جنيه. رقم العم... | UNKNOWN | Unrecognized SMS |  | null | NULL | ✅ |
| تم خصم مبلغ 300 جنيه. الرصيد ا... | UNKNOWN | Unrecognized SMS |  | null | NULL | ✅ |
| تم استلام مبلغ 300 جنيه من 010... | UNKNOWN | Unrecognized SMS |  | null | NULL | ✅ |
| تم استلام مبلغ 300 جنيه من 012... | UNKNOWN | Unrecognized SMS |  | null | NULL | ✅ |
| تم خصم مبلغ 300 جنيه من بطاقة ... | UNKNOWN | Unrecognized SMS |  | null | NULL | ✅ |
| Purchase of EGP 200 at PAYMOB*... | GLOBAL_MERCHANT | PAYMOB*STARBUCKS | STARBUCKS | coffee | coffee | ✅ |
| Purchase of EGP 200 at FAWRY*A... | GLOBAL_MERCHANT | FAWRY*AMAZON CAIRO | AMAZON | shopping | shopping | ✅ |
| Purchase of EGP 200 at PAYMOB ... | UNKNOWN | PAYMOB | PAYMOB | null | NULL | ✅ |
| Purchase of EGP 200 at VALU on... | UNKNOWN | VALU | VALU | null | NULL | ✅ |
| Purchase of EGP 200 at FAWRY o... | GLOBAL_MERCHANT | FAWRY | FAWRY | bills | NULL | ✅ |
| Purchase of EGP 200 at MARKETP... | UNKNOWN | MARKETPLACE | MARKETPLACE | null | NULL | ✅ |
| Purchase of EGP 200 at RENTAL ... | UNKNOWN | RENTAL | RENTAL | null | NULL | ✅ |
| Purchase of EGP 200 at UNKNOWN... | UNKNOWN | UNKNOWN MERCHANT | UNKNOWN MERCHANT | null | NULL | ✅ |
| Purchase of EGP 200 at AMAZON ... | GLOBAL_MERCHANT | AMAZON EGYPT | AMAZON | shopping | shopping | ✅ |
| Purchase of EGP 200 at CARREFO... | UNKNOWN | CARREFOUR MAADI | CARREFOUR MAADI | null | NULL | ✅ |
| Purchase of EGP 200 at AMAZON ... | GLOBAL_MERCHANT | AMAZON WEB SERVICES | AMAZON WEB SERVICES | subscriptions | NULL | ✅ |
| Purchase of EGP 200 at AMAZON ... | SEMANTIC_KEYWORD | AMAZON FRESH | AMAZON FRESH | shopping | shopping | ✅ |
| Purchase of EGP 200 at AMAZONX... | UNKNOWN | AMAZONXYZ | AMAZONXYZ | null | NULL | ✅ |
| ATM withdrawal of EGP 200 on c... | SEMANTIC_KEYWORD | M withdrawal of EGP 200 | M WITHDRAWAL OF EGP | cash_withdrawal | cash_withdrawal | ✅ |
| سحب نقدي بمبلغ 200 جنيه... | UNKNOWN | Unrecognized SMS | UNRECOGNIZED SMS | null | NULL | ✅ |
| Your card transaction of EGP 2... | UNKNOWN | Unrecognized SMS | UNRECOGNIZED SMS | null | NULL | ✅ |
| Purchase of EGP 200 at PLAYSTA... | UNKNOWN | PLAYSTATION | PLAYSTATION | null | NULL | ✅ |
| Purchase of EGP 200 at ONLINE ... | UNKNOWN | ONLINE | ONLINE | null | NULL | ✅ |
