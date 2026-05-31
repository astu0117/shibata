#include <stdio.h>
#include <stdlib.h>
#include <math.h>

// --- 定数定義 ---
#define NUM_VISIBLE (128 * 128)
#define NUM_HIDDEN_1 4000
#define NUM_HIDDEN_2 2000
#define WEIGHT_FILE_PATH "dbm_weights.bin"

// --- グローバル変数 (long double) ---
long double *w1, *w2;
long double *v_bias, *h1_bias, *h2_bias;

// --- 関数定義 ---

// メモリ確保
void allocateMemory() {
    w1 = (long double*)malloc((size_t)NUM_VISIBLE * NUM_HIDDEN_1 * sizeof(long double));
    w2 = (long double*)malloc((size_t)NUM_HIDDEN_1 * NUM_HIDDEN_2 * sizeof(long double));
    v_bias = (long double*)malloc(NUM_VISIBLE * sizeof(long double));
    h1_bias = (long double*)malloc(NUM_HIDDEN_1 * sizeof(long double));
    h2_bias = (long double*)malloc(NUM_HIDDEN_2 * sizeof(long double));
    
    if (!w1 || !w2 || !v_bias || !h1_bias || !h2_bias) {
        fprintf(stderr, "メモリ確保失敗\n");
        exit(1);
    }
}

void writeNet(char* file_name) {
    FILE *fp = fopen(file_name, "wb");
    if (fp == NULL) {
        fprintf(stderr, "ファイルを開けませんでした: %s\n", file_name);
        return;
    }

    // w1 の書き出し
    fwrite(w1, sizeof(long double), (size_t)NUM_VISIBLE * NUM_HIDDEN_1, fp);
    // w2 の書き出し
    fwrite(w2, sizeof(long double), (size_t)NUM_HIDDEN_1 * NUM_HIDDEN_2, fp);
    // バイアスの書き出し
    fwrite(v_bias, sizeof(long double), NUM_VISIBLE, fp);
    fwrite(h1_bias, sizeof(long double), NUM_HIDDEN_1, fp);
    fwrite(h2_bias, sizeof(long double), NUM_HIDDEN_2, fp);

    fclose(fp);
    printf("学習結果を %s に保存しました。\n", file_name);
}
int main(void) {
    allocateMemory();
    
    // ... 初期化 (initNet)
    // ... データ読み込み (readData)
    // ... 学習 (trainDBM)
    
    // 学習結果の保存
   
    writeNet("weights_boltzmann.bin");

    // メモリ解放
    free(w1); free(w2);
    free(v_bias); free(h1_bias); free(h2_bias);
    
    return 0;
}