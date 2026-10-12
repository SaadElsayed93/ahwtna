import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  type BoardEnd,
  type BoardState,
  type MatchScore2P,
  type SeatIndex,
  type Tile,
} from '@ahwtna/shared';
import { chooseAIMove } from './ai.js';
import { createEmptyBoard, getPlayableEnds, isBoardEmpty } from './board.js';
import { dealInitialTiles, determineFirstRoundOpener } from './deal.js';
import { executePlayerMove, type MoveContext } from './move-validator.js';
import {
  applyRoundScoreAndCheckMatchEnd,
  calculateBlockedGameResult,
  calculateDominoOutResult,
} from './scoring.js';
import { executeDraw, executePass, isGameBlocked, type TurnContext } from './turn-cycle.js';

function formatTile(tile: Tile): string {
  return `[${tile[0]}|${tile[1]}]`;
}

function renderBoard(board: BoardState): string {
  if (isBoardEmpty(board)) {
    return '  (الطاولة فارغة — في انتظار النقلة الأولى)';
  }
  const chainStr = board.nodes.map(n => formatTile(n.tile)).join(' — ');
  return `  الطرف الأيسر: (${board.leftValue}) <=== ${chainStr} ===> الطرف الأيمن: (${board.rightValue})`;
}

async function startCliGame() {
  const rl = readline.createInterface({ input, output });

  console.log('\n======================================================');
  console.log('   ☕ مرحباً بك في طاولة قهوتنا | دومينو 101 🎲');
  console.log('   تجربة تفاعلية يدوية ضد الذكاء الاصطناعي (عم شكشك)');
  console.log('======================================================\n');

  let matchScore: MatchScore2P = { seat0: 0, seat1: 0 };
  let roundNum = 1;

  while (matchScore.seat0 < 101 && matchScore.seat1 < 101) {
    console.log(`\n------------------------------------------------------`);
    console.log(`🏆 الجولة رقم ${roundNum}`);
    console.log(`📊 الرصيد التراكمي: أنت [${matchScore.seat0}] | عم شكشك [${matchScore.seat1}] (حد الخسارة: 101)`);
    console.log(`------------------------------------------------------`);

    const deal = dealInitialTiles('INDIVIDUAL_2P');
    let hands: Record<SeatIndex, Tile[]> = {
      0: [...deal.hands[0]], // اللاعب البشري (أنت)
      1: [...deal.hands[1]], // الـ AI (عم شكشك)
      2: [],
      3: [],
    };
    let boneyard: Tile[] = [...deal.boneyard];
    let board: BoardState = createEmptyBoard();

    const opener = determineFirstRoundOpener(deal.hands);
    let activeSeat: SeatIndex = opener.starterSeat;

    console.log(`\n🎲 صاحب البداية: ${activeSeat === 0 ? 'أنت' : 'عم شكشك'} بالبلاطة ${formatTile(opener.startingTile)}`);

    let isRoundOver = false;

    while (!isRoundOver) {
      console.log('\n' + renderBoard(board));

      if (activeSeat === 0) {
        // دور اللاعب البشري
        console.log(`\n🟢 دورك الحالي! (المتبقي في المخزون: ${boneyard.length})`);
        console.log('قطع يدك:');
        hands[0].forEach((tile, idx) => {
          const playable = getPlayableEnds(tile, board);
          const hint = playable.length > 0 ? `(ممكن تلعب: ${playable.join(' أو ')})` : '';
          console.log(`  ${idx + 1}. ${formatTile(tile)} ${hint}`);
        });

        let turnDone = false;
        while (!turnDone) {
          const answer = (
            await rl.question('\n👉 اختر رقم البلاطة (أو D للسحب، أو P للتمرير، أو Q للخروج): ')
          ).trim().toUpperCase();

          if (answer === 'Q') {
            console.log('\n👋 مع السلامة ونشوفك على خير في القهوة!\n');
            rl.close();
            return;
          }

          if (answer === 'D') {
            try {
              const turnCtx: TurnContext = {
                mode: 'INDIVIDUAL_2P',
                activeSeat: 0,
                hands,
                boneyard,
                board,
              };
              const drawRes = executeDraw(0, turnCtx);
              hands[0] = [...drawRes.newHand];
              boneyard = [...drawRes.newBoneyard];
              console.log(`\n✅ سحبت بنجاح: ${formatTile(drawRes.drawnTile)}! المتبقي في المخزون: ${boneyard.length}`);
              break; // يتاح له اللعب الآن بنفس الدور
            } catch (err) {
              console.log(`❌ خطأ في السحب: ${(err as Error).message}`);
            }
            continue;
          }

          if (answer === 'P') {
            try {
              const turnCtx: TurnContext = {
                mode: 'INDIVIDUAL_2P',
                activeSeat: 0,
                hands,
                boneyard,
                board,
              };
              const passRes = executePass(0, turnCtx);
              console.log('\n⏩ مررت الدور لعم شكشك.');
              if (passRes.isBlocked) {
                const blockedResult = calculateBlockedGameResult('INDIVIDUAL_2P', hands, roundNum);
                console.log('\n🔒 قفلة! تم إغلاق اللعب بالكامل!');
                handleRoundEnd(blockedResult);
                isRoundOver = true;
              } else {
                activeSeat = 1;
              }
              turnDone = true;
            } catch (err) {
              console.log(`❌ خطأ في التمرير: ${(err as Error).message}`);
            }
            continue;
          }

          const tileNum = parseInt(answer, 10);
          if (isNaN(tileNum) || tileNum < 1 || tileNum > hands[0].length) {
            console.log('⚠️ اختيار غير صالح، حاول مرة أخرى.');
            continue;
          }

          const chosenTile = hands[0][tileNum - 1]!;
          let targetEnd: BoardEnd = 'LEFT';

          if (!isBoardEmpty(board)) {
            const ends = getPlayableEnds(chosenTile, board);
            if (ends.length === 0) {
              console.log(`❌ البلاطة ${formatTile(chosenTile)} لا تطابق أي طرف مفتوح!`);
              continue;
            } else if (ends.length === 1) {
              targetEnd = ends[0]!;
            } else {
              const sideAns = (
                await rl.question('  اختر الطرف (L لليسار / R لليمين): ')
              ).trim().toUpperCase();
              targetEnd = sideAns === 'R' ? 'RIGHT' : 'LEFT';
            }
          }

          try {
            const moveCtx: MoveContext = {
              phase: 'PLAYING',
              activeSeat: 0,
              hand: hands[0],
              board,
            };
            const moveRes = executePlayerMove(0, chosenTile, targetEnd, moveCtx);
            board = moveRes.newBoard;
            hands[0] = [...moveRes.newHand];
            console.log(`\n👏 لعبت ${formatTile(chosenTile)} على الطرف ${targetEnd === 'LEFT' ? 'الأيسر' : 'الأيمن'}`);

            if (hands[0].length === 0) {
              console.log('\n🎉 دومينو! خلصت كل ورقك وفزت بالجولة!');
              const outRes = calculateDominoOutResult(0, 'INDIVIDUAL_2P', hands, roundNum);
              handleRoundEnd(outRes);
              isRoundOver = true;
            } else if (isGameBlocked(board, hands)) {
              console.log('\n🔒 قفلة! تم إغلاق اللعب بالكامل!');
              const blockedRes = calculateBlockedGameResult('INDIVIDUAL_2P', hands, roundNum);
              handleRoundEnd(blockedRes);
              isRoundOver = true;
            } else {
              activeSeat = 1;
            }
            turnDone = true;
          } catch (err) {
            console.log(`❌ خطأ: ${(err as Error).message}`);
          }
        }
      } else {
        // دور الذكاء الاصطناعي (عم شكشك)
        console.log('\n🤖 دور عم شكشك يفكر...');
        const aiAction = chooseAIMove({
          seat: 1,
          hand: hands[1],
          board,
          mode: 'INDIVIDUAL_2P',
          boneyardCount: boneyard.length,
        });

        if (aiAction.action === 'PLAY') {
          const moveCtx: MoveContext = {
            phase: 'PLAYING',
            activeSeat: 1,
            hand: hands[1],
            board,
          };
          const moveRes = executePlayerMove(1, aiAction.tile, aiAction.targetEnd, moveCtx);
          board = moveRes.newBoard;
          hands[1] = [...moveRes.newHand];
          console.log(`💬 عم شكشك لعب ${formatTile(aiAction.tile)} على الطرف ${aiAction.targetEnd === 'LEFT' ? 'الأيسر' : 'الأيمن'}`);

          if (hands[1].length === 0) {
            console.log('\n💥 عم شكشك خلص ورقه وفاز بالجولة!');
            const outRes = calculateDominoOutResult(1, 'INDIVIDUAL_2P', hands, roundNum);
            handleRoundEnd(outRes);
            isRoundOver = true;
          } else if (isGameBlocked(board, hands)) {
            console.log('\n🔒 قفلة! تم إغلاق اللعب بالكامل!');
            const blockedRes = calculateBlockedGameResult('INDIVIDUAL_2P', hands, roundNum);
            handleRoundEnd(blockedRes);
            isRoundOver = true;
          } else {
            activeSeat = 0;
          }
        } else if (aiAction.action === 'DRAW') {
          const turnCtx: TurnContext = {
            mode: 'INDIVIDUAL_2P',
            activeSeat: 1,
            hands,
            boneyard,
            board,
          };
          const drawRes = executeDraw(1, turnCtx);
          hands[1] = [...drawRes.newHand];
          boneyard = [...drawRes.newBoneyard];
          console.log(`📦 عم شكشك سحب بلاطة من المخزون (متبقي معه ${hands[1].length} بلاطة)`);
        } else if (aiAction.action === 'PASS') {
          const turnCtx: TurnContext = {
            mode: 'INDIVIDUAL_2P',
            activeSeat: 1,
            hands,
            boneyard,
            board,
          };
          const passRes = executePass(1, turnCtx);
          console.log('💨 عم شكشك خبط على الطاولة ومرر الدور!');
          if (passRes.isBlocked) {
            console.log('\n🔒 قفلة! تم إغلاق اللعب بالكامل!');
            const blockedRes = calculateBlockedGameResult('INDIVIDUAL_2P', hands, roundNum);
            handleRoundEnd(blockedRes);
            isRoundOver = true;
          } else {
            activeSeat = 0;
          }
        }
      }
    }

    function handleRoundEnd(res: ReturnType<typeof calculateDominoOutResult>) {
      console.log('\n--- ملخص الجولة ---');
      res.pipSummaries.forEach(s => {
        const who = s.seat === 0 ? 'أنت' : 'عم شكشك';
        console.log(`  ${who}: باقي معه ${s.tileCount} قطع بمجموع نقاط ${s.sum}`);
      });

      if (res.isTie) {
        console.log('🤝 تعادل في القفلة! لم تضاف أي نقاط عقوبة لأي طرف.');
      } else {
        const winner = res.winnerSeat === 0 ? 'أنت' : 'عم شكشك';
        const loser = res.penalizedSeat === 0 ? 'أنت' : 'عم شكشك';
        console.log(`🏆 فاز بالجولة: ${winner}`);
        console.log(`⚠️ عقوبة الجولة: ${res.penaltyPoints} نقطة أضيفت لرصيد ${loser}`);
      }

      const update = applyRoundScoreAndCheckMatchEnd(matchScore, res, 'INDIVIDUAL_2P');
      matchScore = update.updatedScore as MatchScore2P;
      console.log(`📊 الرصيد الجديد: أنت (${matchScore.seat0}) | عم شكشك (${matchScore.seat1})`);

      if (update.isMatchOver) {
        console.log('\n======================================================');
        if (update.matchWinnerSeat === 0) {
          console.log('🏆 مبروووووك الفوز بالماتش كاملاً! كسبت عم شكشك بجدارة! ☕🎉');
        } else {
          console.log('☕ هارد لك يا بطل! عم شكشك كسب الماتش، الجايات أكتر! 🎲');
        }
        console.log('======================================================\n');
      }
    }

    roundNum++;
  }

  rl.close();
}

startCliGame().catch(console.error);
