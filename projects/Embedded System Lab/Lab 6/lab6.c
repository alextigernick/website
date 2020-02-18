#include "STM32L1xx.h"

#define INS GPIOB->IDR & 0x0F;

uint8_t count = 0;
uint8_t count1 = 0;
uint8_t ce = 0;//count enable
uint8_t key = 0;

uint8_t lu[] = {1,4,7,0xE,2,5,8,0,3,6,9,0xF,0xA,0xB,0xC,0xD};
uint8_t log_2(uint8_t num){
	uint8_t ret;
	for( ret = 0; num > 0; ret++){
		num = num >> 1;
	}
	return ret-1;
}
void delay_us(int delay) {
    TIM6->SR = 0;	
    TIM6->PSC =  4;
    TIM6->ARR = delay;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
void delay_ms(int delay) {
    TIM6->SR = 0;	
    TIM6->PSC =  4000;
    TIM6->ARR = delay;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
void setupTimer7() {
	TIM7->SR = 0;	
    TIM7->PSC =  4000;
    TIM7->ARR = 100;
    TIM7->CNT = 0;
	TIM7->DIER |= TIM_DIER_UIE;
    TIM7->CR1 |= TIM_CR1_CEN;
}
void display() {
	GPIOC->ODR = ((count2 & 0x0F) << 4) | (count & 0x0F);
}
uint8_t countF(uint8_t *count,int num) {
    *count += num;
    if (*count >= 10) {
        *count -= 10;
		return 1;
    }
	return 0;
}
void EXTI0_IRQHandler(){
	uint8_t qq;
	delay_ms(2);
	for(char i = 0; i < 4; i++){
		GPIOB->ODR = 0x000000F0 & (~(0x10 << i));
		delay_us(100);
		qq = INS;
		if(qq != 0xF) {
			key = lu[4*i + log_2((~qq)&0x0F)];
			switch(key){
				case 0:
					ce = !ce;
					if(ce == 0){
						TIM7->DIER &= ~TIM_DIER_UIE; //disable interrupt;
					}
					else {
						setupTimer7(); // just re do the whole setup cause I'm lazy
					}
					break;
				case 1:
					if(ce == 0){
						count = 0;
						count1 = 0;
					}
					break;
			}
			break;
		}
	}
	GPIOB->ODR = 0x00000000;
	display();
	EXTI->PR = 0x00FFFFFF;
}
void TIM7_IRQHandler(){
	if(ce){
		if(countF(&count,1)){
			countF(&count1,1);
		}
		display();
	}
	TIM7->SR &= ~TIM_SR_UIF;
}
void pinSetup() {
    RCC->APB1ENR |= 0x00000030; //enable tim 6 and tim7
    RCC->AHBENR  |= 0x07;
    
	GPIOA->MODER = GPIOA->MODER & 0xFFFF0000;  

	GPIOB->MODER = 0x00005500;
	GPIOB->PUPDR = 0x00000055;

	GPIOC->MODER &= ~0xFFFFFFFF;
    GPIOC->MODER |=  0x55555555;
}
	
int main(void){
    
	SYSCFG->EXTICR[0] = 0;
	//EXTI->RTSR = 	0x00FFFFFF;
	EXTI->EMR = 	0x00000001; 
	EXTI->IMR = 	0x00000001;
	EXTI->FTSR = 	0x00000001;
	NVIC_EnableIRQ(EXTI0_IRQn);
	NVIC_ClearPendingIRQ(EXTI0_IRQn);  
	NVIC_EnableIRQ(TIM7_IRQn);
	NVIC_ClearPendingIRQ(TIM7_IRQn);  
	pinSetup();
	GPIOB->ODR = 0x00000000;
	__enable_irq();
    while(1);
}